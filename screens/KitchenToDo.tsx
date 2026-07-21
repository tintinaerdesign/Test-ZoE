import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  useEffect,
  useMemo,
  useState,
  Fragment,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  STATION_META,
  isTicketComplete,
  lineIsDone,
  type KitchenLine,
  type KitchenStation,
  type KitchenTicket,
  type OrderType,
  type TicketStatus,
} from '../data/kitchen';

type Props = {
  tickets: KitchenTicket[];
  setTickets: Dispatch<SetStateAction<KitchenTicket[]>>;
  onBack?: () => void;
  onOpenNoIngredient?: () => void;
};

type KitchenTab = 'cook' | 'serve';

type OrderSlice = {
  ticketId: string;
  lineId: string;
  orderNo: string;
  table: string;
  type: OrderType;
  status: TicketStatus;
  createdAt: number;
  quantity: number;
  cooking: number;
};

type DishGroup = {
  key: string;
  label: string;
  totalQty: number;
  cookingQty: number;
  waitingQty: number;
  eggCount: number;
  slices: OrderSlice[];
};

/** Kitchen UI is Thai-only; table / staff names may stay as entered. */
function lineLabel(line: KitchenLine) {
  const name = line.nameTh || line.name;
  const option = line.optionLabelTh || line.optionLabel;
  const base = option ? `${name} (${option})` : name;
  return line.note ? `${base} · ${line.note}` : base;
}

function dishKey(line: KitchenLine) {
  return `${line.menuItemId}:${line.optionLabelTh ?? line.optionLabel ?? ''}`;
}

/**
 * Group station work by dish, then break down by table/order (oldest first).
 * Kitchen can batch-cook the total, then plate per table without guessing.
 */
function buildDishGroups(
  tickets: KitchenTicket[],
  station: KitchenStation,
): { groups: DishGroup[]; toCook: number; cooking: number; left: number } {
  const map = new Map<string, DishGroup>();

  for (const ticket of tickets) {
    for (const line of ticket.lines) {
      if (line.station !== station) continue;
      // Standalone egg lines should not appear — eggs attach to dishes.
      if (line.menuItemId === 'egg') continue;
      const key = dishKey(line);
      const existing = map.get(key);
      const eggs = line.eggCount ?? 0;
      const slice: OrderSlice = {
        ticketId: ticket.id,
        lineId: line.id,
        orderNo: ticket.orderNo,
        table: ticket.table,
        type: ticket.type,
        status: ticket.status,
        createdAt: ticket.createdAt,
        quantity: line.quantity,
        cooking: line.cooking,
      };

      if (!existing) {
        map.set(key, {
          key,
          label: lineLabel(line),
          totalQty: line.quantity,
          cookingQty: line.cooking,
          waitingQty: Math.max(0, line.quantity - line.cooking),
          eggCount: eggs,
          slices: [slice],
        });
      } else {
        existing.totalQty += line.quantity;
        existing.cookingQty += line.cooking;
        existing.waitingQty += Math.max(0, line.quantity - line.cooking);
        existing.eggCount += eggs;
        existing.slices.push(slice);
      }
    }
  }

  const groups = [...map.values()]
    .map((g) => ({
      ...g,
      slices: g.slices.sort((a, b) => a.createdAt - b.createdAt),
    }))
    .sort((a, b) => {
      const aOldest = a.slices[0]?.createdAt ?? 0;
      const bOldest = b.slices[0]?.createdAt ?? 0;
      return aOldest - bOldest;
    });

  const toCook = groups.reduce((s, g) => s + g.waitingQty, 0);
  const cooking = groups.reduce((s, g) => s + g.cookingQty, 0);
  return { groups, toCook, cooking, left: toCook + cooking };
}

function withCompletedState(ticket: KitchenTicket): KitchenTicket {
  if (!isTicketComplete(ticket)) return ticket;
  const foodLines = ticket.lines.filter((l) => l.menuItemId !== 'egg');
  if (
    ticket.status === 'ready' &&
    ticket.serveComplete === true &&
    foodLines.every(
      (l) =>
        l.isReady === true &&
        (Number(l.cooking) || 0) >= (Number(l.quantity) || 0),
    )
  ) {
    return ticket;
  }
  return {
    ...ticket,
    status: 'ready',
    serveComplete: true,
    lines: ticket.lines.map((l) =>
      l.menuItemId === 'egg'
        ? { ...l, isReady: true, cooking: Math.max(Number(l.cooking) || 0, Number(l.quantity) || 0) }
        : {
            ...l,
            isReady: true,
            cooking: Math.max(Number(l.cooking) || 0, Number(l.quantity) || 0),
          },
    ),
  };
}

export function KitchenToDo({
  tickets,
  setTickets,
  onBack,
  onOpenNoIngredient,
}: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<KitchenTab>('cook');

  /** Keep status / badge in sync when every line is ✓. */
  useEffect(() => {
    setTickets((prev) => {
      let changed = false;
      const next = prev.map((ticket) => {
        const synced = withCompletedState(ticket);
        if (synced !== ticket) changed = true;
        return synced;
      });
      return changed ? next : prev;
    });
  }, [tickets, setTickets]);

  const waitingToServe = useMemo(
    () =>
      tickets
        .filter((t) => !isTicketComplete(t))
        .sort((a, b) => a.createdAt - b.createdAt),
    [tickets],
  );

  /** Badge: only orders that still need serving (not ครบแล้ว). */
  const pendingServeCount = waitingToServe.length;

  const activeTickets = useMemo(
    () => tickets.filter((t) => !isTicketComplete(t)),
    [tickets],
  );

  const snackBoard = useMemo(
    () => buildDishGroups(activeTickets, 'snack'),
    [activeTickets],
  );
  const mainBoard = useMemo(
    () => buildDishGroups(activeTickets, 'main'),
    [activeTickets],
  );

  function cookedCount(station: KitchenStation, dishKeyStr: string) {
    let count = 0;
    for (const ticket of tickets) {
      for (const line of ticket.lines) {
        if (line.station === station && dishKey(line) === dishKeyStr) {
          count += line.cooking;
        }
      }
    }
    return count;
  }

  /** Mark one portion done (oldest unfinished order first). */
  function markDishCooked(station: KitchenStation, dishKeyStr: string) {
    setTickets((prev) => {
      const oldestFirst = [...prev].sort((a, b) => a.createdAt - b.createdAt);
      let targetTicketId: string | null = null;
      let targetLineId: string | null = null;

      for (const ticket of oldestFirst) {
        for (const line of ticket.lines) {
          if (line.station !== station) continue;
          if (dishKey(line) !== dishKeyStr) continue;
          if (line.cooking >= line.quantity) continue;
          targetTicketId = ticket.id;
          targetLineId = line.id;
          break;
        }
        if (targetTicketId) break;
      }

      if (!targetTicketId || !targetLineId) return prev;

      return prev.map((ticket) => {
        if (ticket.id !== targetTicketId) return ticket;
        const lines = ticket.lines.map((line) =>
          line.id === targetLineId
            ? { ...line, cooking: line.cooking + 1 }
            : line,
        );
        const allCooked = lines.every(
          (l) => (Number(l.cooking) || 0) >= (Number(l.quantity) || 0),
        );
        return withCompletedState({
          ...ticket,
          lines: allCooked
            ? lines.map((l) => ({ ...l, isReady: true }))
            : lines,
          serveComplete: allCooked ? true : ticket.serveComplete,
          status: allCooked
            ? ('ready' as const)
            : ticket.status === 'queued'
              ? ('cooking' as const)
              : ticket.status,
        });
      });
    });
  }

  /** Undo one portion (newest marked first) — for accidental taps. */
  function unmarkDishCooked(station: KitchenStation, dishKeyStr: string) {
    setTickets((prev) => {
      const newestFirst = [...prev].sort((a, b) => b.createdAt - a.createdAt);
      let targetTicketId: string | null = null;
      let targetLineId: string | null = null;

      for (const ticket of newestFirst) {
        for (const line of ticket.lines) {
          if (line.station !== station) continue;
          if (dishKey(line) !== dishKeyStr) continue;
          if (line.cooking <= 0) continue;
          targetTicketId = ticket.id;
          targetLineId = line.id;
          break;
        }
        if (targetTicketId) break;
      }

      if (!targetTicketId || !targetLineId) return prev;

      return prev.map((ticket) => {
        if (ticket.id !== targetTicketId) return ticket;
        const lines = ticket.lines.map((line) =>
          line.id === targetLineId
            ? {
                ...line,
                cooking: Math.max(0, line.cooking - 1),
                isReady: false,
              }
            : line,
        );
        const allCooked = lines.every((l) => l.cooking >= l.quantity);
        const anyCooking = lines.some((l) => l.cooking > 0);
        return {
          ...ticket,
          lines,
          serveComplete: allCooked ? true : false,
          status: allCooked
            ? ('ready' as const)
            : anyCooking
              ? ('cooking' as const)
              : ('queued' as const),
        };
      });
    });
  }

  function onCookProgressPress(
    station: KitchenStation,
    dishKeyStr: string,
    allDone: boolean,
  ) {
    if (allDone) unmarkDishCooked(station, dishKeyStr);
    else markDishCooked(station, dishKeyStr);
  }

  function markDone(ticketId: string) {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  function toggleServeComplete(ticketId: string) {
    setTickets((prev) => {
      const ticket = prev.find((t) => t.id === ticketId);
      if (!ticket) return prev;

      // Already complete — keep ticket for PlaceOrder history (long-press clears).
      if (isTicketComplete(ticket)) {
        return prev;
      }

      return prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          serveComplete: true,
          lines: t.lines.map((l) => ({ ...l, isReady: true })),
        };
      });
    });
  }

  function toggleLineReady(ticketId: string, lineId: string) {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const lines = t.lines.map((l) => {
          if (l.id !== lineId) return l;
          const nextReady = !l.isReady;
          return {
            ...l,
            isReady: nextReady,
            // Checking ✓ also fills cooking so kitchen + serve stay aligned.
            cooking: nextReady
              ? Math.max(Number(l.cooking) || 0, Number(l.quantity) || 0)
              : Number(l.cooking) || 0,
          };
        });
        return withCompletedState({
          ...t,
          lines,
          serveComplete: lines.every(lineIsDone),
          status: lines.every(lineIsDone)
            ? ('ready' as const)
            : t.status === 'ready'
              ? ('cooking' as const)
              : t.status,
        });
      }),
    );
  }

  function stationCard(station: KitchenStation) {
    const meta = STATION_META[station];
    const board = station === 'snack' ? snackBoard : mainBoard;

    return (
      <View style={[styles.stationCard, { borderLeftColor: meta.color }]}>
        <Text style={[styles.stationTitle, { color: meta.color }]}>
          {meta.nameTh}
        </Text>

        {board.groups.length === 0 ? (
          <Text style={styles.emptyLine}>ยังไม่มีออเดอร์</Text>
        ) : (
          board.groups.map((group, groupIndex) => {
            const done = cookedCount(station, group.key);
            const allDone = done >= group.totalQty;
            return (
              <Fragment key={group.key}>
                {groupIndex > 0 ? <View style={styles.dishDivider} /> : null}
                <View
                  style={[styles.dishBlock, allDone && styles.dishBlockDone]}
                >
                  <View style={styles.dishHead}>
                    <Text
                      style={[
                        styles.dishName,
                        allDone && styles.dishNameDone,
                      ]}
                      numberOfLines={2}
                    >
                      {group.label}
                    </Text>
                    {group.eggCount > 0 ? (
                      <View style={styles.eggAddBtn}>
                        <Text style={styles.eggAddBtnText}>
                          +ไข่×{group.eggCount}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={[
                        styles.dishProgress,
                        { color: allDone ? '#81C784' : meta.color },
                      ]}
                    >
                      {done}/{group.totalQty}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.cookDoneBtn,
                        allDone && styles.cookDoneBtnDone,
                        pressed && styles.cookDoneBtnHover,
                      ]}
                      onPress={() =>
                        onCookProgressPress(station, group.key, allDone)
                      }
                      onLongPress={() =>
                        unmarkDishCooked(station, group.key)
                      }
                      hitSlop={6}
                      accessibilityLabel={
                        allDone ? 'ยกเลิกทำเสร็จ' : 'ทำเสร็จแล้ว'
                      }
                    >
                      <Text style={styles.cookDoneBtnText}>✓</Text>
                    </Pressable>
                  </View>
                </View>
              </Fragment>
            );
          })
        )}
      </View>
    );
  }

  function readyCard(item: KitchenTicket) {
    const complete = isTicketComplete(item);
    const statusHint = complete
      ? 'พร้อม'
      : item.status === 'cooking'
        ? 'กำลังทำ'
        : 'รอทำ';
    return (
      <View
        key={item.id}
        style={[
          styles.readyCard,
          complete ? styles.readyCardComplete : styles.readyCardPartial,
        ]}
      >
        <Text style={styles.readyTitle}>
          #{item.orderNo} · {item.table} · {statusHint}
        </Text>
        {item.lines
          .filter((line) => line.menuItemId !== 'egg')
          .map((line) => {
          const cooked = line.cooking >= line.quantity;
          const checked = lineIsDone(line);
          return (
            <Pressable
              key={line.id}
              onPress={() => toggleLineReady(item.id, line.id)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.readyLineBtn,
                pressed && styles.readyLineBtnHover,
              ]}
            >
              <Text
                style={[styles.readyLine, checked && styles.readyLineDone]}
              >
                {checked ? '✓' : '○'} {lineLabel(line)} ×{line.quantity}
                {!cooked && line.cooking > 0
                  ? ` (${line.cooking}/${line.quantity})`
                  : ''}
              </Text>
              {(line.eggCount ?? 0) > 0 ? (
                <View style={styles.eggAddBtn}>
                  <Text style={styles.eggAddBtnText}>
                    +ไข่×{line.eggCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          style={({ pressed }) => [
            styles.doneBtn,
            complete ? styles.doneBtnComplete : styles.doneBtnPartial,
            pressed && styles.doneBtnHover,
          ]}
          onPress={() => toggleServeComplete(item.id)}
          onLongPress={() => markDone(item.id)}
        >
          <Text style={styles.doneText}>
            {complete ? '✓ ครบแล้ว' : 'ยังไม่ครบ'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <View style={styles.sectionHead}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnHover,
            ]}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </Pressable>
        ) : null}

        <View style={styles.tabRow}>
          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              tab === 'cook' && styles.tabBtnActive,
              pressed && styles.tabBtnHover,
            ]}
            onPress={() => setTab('cook')}
          >
            <Text
              style={[styles.tabText, tab === 'cook' && styles.tabTextActive]}
            >
              ครัว
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              tab === 'serve' && styles.tabBtnActive,
              pressed && styles.tabBtnHover,
            ]}
            onPress={() => setTab('serve')}
          >
            <Text
              style={[styles.tabText, tab === 'serve' && styles.tabTextActive]}
            >
              รอเสิร์ฟ
            </Text>
            {pendingServeCount > 0 ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingServeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {onOpenNoIngredient ? (
          <Pressable
            onPress={onOpenNoIngredient}
            hitSlop={8}
            style={({ pressed }) => [
              styles.stockBtn,
              pressed && styles.stockBtnHover,
            ]}
            accessibilityRole="link"
            accessibilityLabel="วัตถุดิบหมด"
          >
            <MaterialCommunityIcons
              name="food-off-outline"
              size={16}
              color="#FFE600"
            />
            <Text style={styles.stockBtnText}>วัตถุดิบ</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[
          styles.bodyScrollContent,
          tab === 'serve' && styles.bodyScrollServe,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'cook' ? (
          <View style={styles.stationGrid}>
            <View style={styles.stationGridItem}>{stationCard('snack')}</View>
            <View style={styles.stationGridItem}>{stationCard('main')}</View>
          </View>
        ) : waitingToServe.length === 0 ? (
          <Text style={styles.emptyReady}>ยังไม่มีรายการที่รอเสิร์ฟ</Text>
        ) : (
          <View style={styles.readyGrid}>{waitingToServe.map(readyCard)}</View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    gap: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: {
    backgroundColor: '#2E2E2E',
  },
  stockBtn: {
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#FFE600',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stockBtnHover: {
    backgroundColor: '#2E2E2E',
  },
  stockBtnText: {
    color: '#FFE600',
    fontSize: 12,
    fontWeight: '800',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  tabBtnActive: {
    backgroundColor: '#2A2A2A',
  },
  tabBtnHover: {
    backgroundColor: '#222',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFE600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#FB8C00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 12,
  },
  bodyScrollServe: {
    flexGrow: 1,
  },
  stationGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stationGridItem: {
    flex: 1,
    minWidth: 0,
  },
  stationCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 12,
    gap: 10,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  dishBlock: {
    gap: 8,
  },
  dishBlockDone: {
    opacity: 0.45,
  },
  dishHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eggAddBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFE600',
  },
  eggAddBtnText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '900',
  },
  dishName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  dishNameDone: {
    color: '#9A9A9A',
  },
  dishProgress: {
    fontSize: 20,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'right',
  },
  cookDoneBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookDoneBtnHover: {
    backgroundColor: '#3A3A3A',
    borderColor: '#888',
  },
  cookDoneBtnDone: {
    backgroundColor: '#1B3D1E',
    borderColor: '#43A047',
  },
  cookDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: -1,
  },
  sliceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dishDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#555',
    marginVertical: 8,
  },
  sliceCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  sliceCardCooking: {
    opacity: 0.5,
  },
  sliceCardText: {
    color: '#D0D0D0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  emptyLine: {
    color: '#555',
    fontSize: 16,
    paddingVertical: 4,
  },
  readyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  readyCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 6,
  },
  readyCardComplete: {
    backgroundColor: '#142016',
    borderColor: '#43A047',
  },
  readyCardPartial: {
    backgroundColor: '#1A160E',
    borderColor: '#FB8C00',
  },
  readyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  readyLineBtn: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginHorizontal: -4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  readyLineBtnHover: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  readyLine: {
    color: '#C8C8C8',
    fontSize: 20,
    fontWeight: '600',
  },
  readyLineDone: {
    color: '#81C784',
  },
  doneBtn: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnHover: {
    opacity: 0.85,
  },
  doneBtnComplete: {
    backgroundColor: '#43A047',
  },
  doneBtnPartial: {
    backgroundColor: '#FB8C00',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyReady: {
    color: '#666',
    fontSize: 15,
    paddingVertical: 40,
    textAlign: 'center',
  },
});
