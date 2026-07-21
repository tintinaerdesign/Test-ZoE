import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinModal } from '../components/PinModal';
import { StaffNav } from '../components/StaffNav';
import { type CashPayStatus, type KitchenTicket } from '../data/kitchen';
import { EGG_ADDON, findMenuItem } from '../data/menu';
import { colors } from '../utils/colors';
import { formatBaht, formatOrderTime } from '../utils/format';

type Props = {
  tickets: KitchenTicket[];
  setTickets: (
    updater: (prev: KitchenTicket[]) => KitchenTicket[],
  ) => void;
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  nickname?: string;
  /** Cashier PIN (same as login PIN). */
  cashierPin: string;
  onPlaceOrder: () => void;
  onOpenCashier?: () => void;
  onOpenKitchen?: () => void;
  onLogout?: () => void;
  onReady?: () => void;
};

const COPY = {
  en: {
    placeOrder: 'Place Order',
    empty: 'No orders yet',
    cashUnpaid: 'Unpaid',
    markPaid: 'Confirm payment at cashier',
    latest: 'Latest',
    logout: 'Logout',
  },
  th: {
    placeOrder: 'Place Order',
    empty: 'ยังไม่มีออเดอร์',
    cashUnpaid: 'ยังไม่จ่าย',
    markPaid: 'ยืนยันชำระที่แคชเชียร์',
    latest: 'ล่าสุด',
    logout: 'ออก',
  },
};

function ticketTotal(ticket: KitchenTicket) {
  return ticket.lines.reduce((sum, line) => {
    if (line.menuItemId === 'egg') return sum;
    const item = findMenuItem(line.menuItemId);
    const unit = item?.price ?? 0;
    const eggs = (line.eggCount ?? 0) * EGG_ADDON.price;
    return sum + unit * line.quantity + eggs;
  }, 0);
}

type BillRowProps = {
  item: KitchenTicket;
  isLatest: boolean;
  cashUnpaidLabel: string;
  markPaidLabel: string;
  latestLabel: string;
  onMarkPaid: (ticketId: string) => void;
};

const UnpaidBillRow = memo(function UnpaidBillRow({
  item,
  isLatest,
  cashUnpaidLabel,
  markPaidLabel,
  latestLabel,
  onMarkPaid,
}: BillRowProps) {
  const total = useMemo(() => ticketTotal(item), [item]);

  return (
    <View style={[styles.card, isLatest && styles.cardLatest]}>
      <View style={styles.metaLeft}>
        <View style={styles.nameRow}>
          <Text style={styles.staffName} numberOfLines={1}>
            {item.staffName?.trim() || '—'}
          </Text>
          <Text style={styles.orderTime}>
            {formatOrderTime(item.createdAt)}
          </Text>
          {isLatest ? (
            <View style={styles.latestBadge}>
              <Text style={styles.latestBadgeText}>{latestLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.tableName} numberOfLines={1}>
          {item.table}
        </Text>
      </View>

      <View style={styles.cashBlock}>
        <View style={[styles.payBar, styles.payBarCashUnpaid]}>
          <MaterialCommunityIcons name="cash" size={16} color="#111111" />
          <Text style={styles.payBarText}>{cashUnpaidLabel}</Text>
          <Text style={styles.payBarAmount}>{formatBaht(total)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.markPaidBtn,
            pressed && styles.markPaidBtnPressed,
          ]}
          onPress={() => onMarkPaid(item.id)}
        >
          <Text style={styles.markPaidText}>{markPaidLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
});

/**
 * Waiter home — Place Order + own unpaid cash bills only.
 */
export function PlaceOrder({
  tickets,
  setTickets,
  lang,
  setLang,
  nickname,
  cashierPin,
  onPlaceOrder,
  onOpenCashier,
  onOpenKitchen,
  onLogout,
  onReady,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = COPY[lang];
  const readySent = useRef(false);
  const pinTicketIdRef = useRef<string | null>(null);
  const [pinTicketId, setPinTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (readySent.current || !onReady) return;
    readySent.current = true;
    onReady();
  }, [onReady]);

  /** Own unpaid cash bills only — paid / QR cards stay on Cashier. */
  const ordered = useMemo(() => {
    const me = nickname?.trim().toLowerCase() ?? '';
    return tickets
      .filter((ticket) => {
        if (!me) return false;
        if ((ticket.staffName?.trim().toLowerCase() ?? '') !== me) return false;
        return (
          ticket.paymentMethod === 'cash' &&
          ticket.cashStatus !== 'paid_at_cashier'
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tickets, nickname]);

  const latestId = useMemo(() => {
    if (ordered.length === 0) return null;
    let best = ordered[0];
    for (const ticket of ordered) {
      if (ticket.createdAt > best.createdAt) best = ticket;
    }
    return best.id;
  }, [ordered]);

  /** Open PIN after the press gesture ends so the modal isn't dismissed instantly. */
  const openCashierPin = useCallback((ticketId: string) => {
    pinTicketIdRef.current = ticketId;
    setTimeout(() => setPinTicketId(ticketId), 50);
  }, []);

  function closeCashierPin() {
    pinTicketIdRef.current = null;
    setPinTicketId(null);
  }

  function markCashPaid(ticketId: string) {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId && ticket.paymentMethod === 'cash'
          ? { ...ticket, cashStatus: 'paid_at_cashier' as CashPayStatus }
          : ticket,
      ),
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: KitchenTicket }) => (
      <UnpaidBillRow
        item={item}
        isLatest={item.id === latestId}
        cashUnpaidLabel={t.cashUnpaid}
        markPaidLabel={t.markPaid}
        latestLabel={t.latest}
        onMarkPaid={openCashierPin}
      />
    ),
    [latestId, openCashierPin, t.cashUnpaid, t.latest, t.markPaid],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 14,
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        },
      ]}
    >
      <PinModal
        key={pinTicketId ?? 'pin-closed'}
        visible={pinTicketId != null}
        lang={lang}
        expectedPin={cashierPin}
        onSubmit={() => {
          const id = pinTicketIdRef.current;
          if (id) markCashPaid(id);
          closeCashierPin();
        }}
        onClose={closeCashierPin}
      />

      <StaffNav
        lang={lang}
        setLang={setLang}
        nickname={nickname}
        logoutLabel={t.logout}
        onOpenCashier={onOpenCashier}
        onOpenKitchen={onOpenKitchen}
        onLogout={onLogout}
      />

      <Pressable
        style={({ pressed }) => [
          styles.placeBtn,
          pressed && styles.placeBtnPressed,
        ]}
        onPress={onPlaceOrder}
      >
        <MaterialCommunityIcons name="plus-circle" size={22} color="#111111" />
        <Text style={styles.placeBtnText}>{t.placeOrder}</Text>
      </Pressable>

      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>{t.empty}</Text>}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    gap: 14,
  },
  placeBtn: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeBtnPressed: {
    opacity: 0.88,
  },
  placeBtnText: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
  },
  list: {
    gap: 10,
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
    gap: 10,
    backgroundColor: '#141414',
  },
  cardLatest: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,230,0,0.08)',
  },
  metaLeft: {
    gap: 2,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  staffName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  orderTime: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  latestBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  latestBadgeText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '900',
  },
  tableName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  cashBlock: {
    gap: 8,
  },
  payBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  payBarCashUnpaid: {
    backgroundColor: '#FFB74D',
  },
  payBarText: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '400',
    flex: 1,
  },
  payBarAmount: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '400',
    marginLeft: 'auto',
  },
  markPaidBtn: {
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  markPaidBtnPressed: {
    backgroundColor: 'rgba(255,230,0,0.12)',
  },
  markPaidText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
});
