import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinModal } from '../components/PinModal';
import { StaffNav } from '../components/StaffNav';
import {
  lineIsDone,
  type CashPayStatus,
  type KitchenLine,
  type KitchenTicket,
} from '../data/kitchen';
import { EGG_ADDON, findMenuItem } from '../data/menu';
import { colors } from '../utils/colors';
import { formatBaht, formatOrderTime } from '../utils/format';

type GroupMode = 'time' | 'staff';

type TicketSection = {
  key: string;
  title: string;
  sortKey: number;
  data: KitchenTicket[];
};

type Props = {
  /** All staff payment tickets. */
  tickets: KitchenTicket[];
  setTickets: (
    updater: (prev: KitchenTicket[]) => KitchenTicket[],
  ) => void;
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  nickname?: string;
  cashierPin: string;
  onBack: () => void;
  onOpenKitchen?: () => void;
  onLogout?: () => void;
};

const COPY = {
  en: {
    title: 'Cashier Mode',
    empty: 'No payments yet',
    more: 'Details',
    hide: 'Hide',
    served: 'Served',
    pendingServe: 'Not served',
    payQr: 'Paid by QR',
    cashUnpaid: 'Unpaid',
    cashPaid: 'Paid',
    markPaid: 'pay',
    viewPhoto: 'View photo',
    closePhoto: 'Close',
    logout: 'Logout',
    back: 'Back',
    groupBy: 'Group by',
    groupTime: 'Order time',
    groupStaff: 'Staff',
    unknownStaff: 'Unknown',
  },
  th: {
    title: 'Cashier Mode',
    empty: 'ยังไม่มีการชำระเงิน',
    more: 'เพิ่มเติม',
    hide: 'ย่อ',
    served: 'เสิร์ฟแล้ว',
    pendingServe: 'ยังไม่เสิร์ฟ',
    payQr: 'ชำระด้วย QR',
    cashUnpaid: 'ยังไม่จ่าย',
    cashPaid: 'ชำระเงินแล้ว',
    markPaid: 'ยืนยันชำระที่แคชเชียร์',
    viewPhoto: 'ดูรูปภาพ',
    closePhoto: 'ปิด',
    logout: 'ออก',
    back: 'กลับ',
    groupBy: 'แยกตาม',
    groupTime: 'เวลาที่สั่ง',
    groupStaff: 'ชื่อพนักงาน',
    unknownStaff: 'ไม่ระบุ',
  },
};

function isUnpaidCash(ticket: KitchenTicket) {
  return (
    ticket.paymentMethod === 'cash' && ticket.cashStatus !== 'paid_at_cashier'
  );
}

function staffLabel(ticket: KitchenTicket, unknown: string) {
  const name = ticket.staffName?.trim();
  return name || unknown;
}

/** Bucket by local hour of order time. */
function timeBucket(createdAt: number) {
  const d = new Date(createdAt);
  const start = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    0,
    0,
    0,
  );
  const hh = String(d.getHours()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return {
    key: `${start.getTime()}`,
    sortKey: start.getTime(),
    titleEn: `${day}/${month} · ${hh}:00`,
    titleTh: `${day}/${month} · ${hh}:00 น.`,
  };
}

function sortTickets(a: KitchenTicket, b: KitchenTicket) {
  const aUnpaid = isUnpaidCash(a) ? 0 : 1;
  const bUnpaid = isUnpaidCash(b) ? 0 : 1;
  if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
  return b.createdAt - a.createdAt;
}

function lineLabel(line: KitchenLine) {
  const name = line.nameTh || line.name;
  const option = line.optionLabelTh || line.optionLabel;
  const base = option ? `${name} (${option})` : name;
  return line.note ? `${base} · ${line.note}` : base;
}

function ticketTotal(ticket: KitchenTicket) {
  return ticket.lines.reduce((sum, line) => {
    if (line.menuItemId === 'egg') return sum;
    const item = findMenuItem(line.menuItemId);
    const unit = item?.price ?? 0;
    const eggs = (line.eggCount ?? 0) * EGG_ADDON.price;
    return sum + unit * line.quantity + eggs;
  }, 0);
}

/**
 * Cashier board — payment cards for every staff member's orders.
 */
export function CashierScreen({
  tickets,
  setTickets,
  lang,
  setLang,
  nickname,
  cashierPin,
  onBack,
  onOpenKitchen,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = COPY[lang];
  const pinTicketIdRef = useRef<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [pinTicketId, setPinTicketId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('time');

  const sections = useMemo((): TicketSection[] => {
    const map = new Map<string, TicketSection>();

    for (const ticket of tickets) {
      if (groupMode === 'staff') {
        const title = staffLabel(ticket, t.unknownStaff);
        const key = `staff:${title}`;
        const existing = map.get(key);
        if (existing) {
          existing.data.push(ticket);
          existing.sortKey = Math.max(existing.sortKey, ticket.createdAt);
        } else {
          map.set(key, {
            key,
            title,
            sortKey: ticket.createdAt,
            data: [ticket],
          });
        }
      } else {
        const bucket = timeBucket(ticket.createdAt);
        const existing = map.get(bucket.key);
        const title = lang === 'th' ? bucket.titleTh : bucket.titleEn;
        if (existing) {
          existing.data.push(ticket);
        } else {
          map.set(bucket.key, {
            key: bucket.key,
            title,
            sortKey: bucket.sortKey,
            data: [ticket],
          });
        }
      }
    }

    const list = [...map.values()].map((section) => ({
      ...section,
      data: [...section.data].sort(sortTickets),
    }));

    list.sort((a, b) => {
      if (groupMode === 'staff') {
        if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
        return a.title.localeCompare(b.title, lang === 'th' ? 'th' : 'en');
      }
      return b.sortKey - a.sortKey;
    });

    return list;
  }, [tickets, groupMode, lang, t.unknownStaff]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openCashierPin(ticketId: string) {
    pinTicketIdRef.current = ticketId;
    setTimeout(() => setPinTicketId(ticketId), 50);
  }

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

  function paidActionButton(label: string, evidenceUri?: string) {
    const body = (
      <>
        <MaterialCommunityIcons
          name="check-circle"
          size={18}
          color={colors.primary}
        />
        <Text style={styles.paidBtnText}>{label}</Text>
        {evidenceUri ? (
          <>
            <View style={styles.paidBtnDivider} />
            <MaterialCommunityIcons
              name="image-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.paidBtnText}>{t.viewPhoto}</Text>
          </>
        ) : null}
      </>
    );

    if (evidenceUri) {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.paidBtn,
            pressed && styles.paidBtnPressed,
          ]}
          onPress={() => setPhotoUri(evidenceUri)}
        >
          {body}
        </Pressable>
      );
    }

    return <View style={styles.paidBtn}>{body}</View>;
  }

  function paymentBar(item: KitchenTicket, total: number) {
    if (item.paymentMethod === 'qr') {
      return (
        <View style={styles.cashBlock}>
          <View style={[styles.payBar, styles.payBarQr]}>
            <MaterialCommunityIcons
              name="qrcode"
              size={16}
              color="#111111"
            />
            <Text style={styles.payBarText}>{t.payQr}</Text>
            <Text style={styles.payBarAmount}>{formatBaht(total)}</Text>
          </View>
          {paidActionButton(t.payQr, item.paymentEvidenceUri)}
        </View>
      );
    }

    const unpaid = item.cashStatus !== 'paid_at_cashier';
    return (
      <View style={styles.cashBlock}>
        <View
          style={[
            styles.payBar,
            unpaid ? styles.payBarCashUnpaid : styles.payBarCashPaid,
          ]}
        >
          <MaterialCommunityIcons
            name="cash"
            size={16}
            color={unpaid ? '#111111' : '#FFFFFF'}
          />
          <Text
            style={[styles.payBarText, !unpaid && styles.payBarTextOnDark]}
          >
            {unpaid ? t.cashUnpaid : t.cashPaid}
          </Text>
          <Text
            style={[styles.payBarAmount, !unpaid && styles.payBarTextOnDark]}
          >
            {formatBaht(total)}
          </Text>
        </View>
        {unpaid ? (
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.markPaidBtn,
                styles.actionRowPrimary,
                pressed && styles.markPaidBtnPressed,
              ]}
              onPress={() => openCashierPin(item.id)}
            >
              <Text style={styles.markPaidText}>{t.markPaid}</Text>
            </Pressable>
            {item.paymentEvidenceUri ? (
              <Pressable
                style={({ pressed }) => [
                  styles.viewPhotoInlineBtn,
                  pressed && styles.paidBtnPressed,
                ]}
                onPress={() => setPhotoUri(item.paymentEvidenceUri!)}
              >
                <MaterialCommunityIcons
                  name="image-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.viewPhotoInlineText}>{t.viewPhoto}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          paidActionButton(t.cashPaid, item.paymentEvidenceUri)
        )}
      </View>
    );
  }

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

      <Modal
        visible={photoUri != null}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setPhotoUri(null)}
      >
        <View style={styles.photoBackdrop}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            style={styles.photoCloseBtn}
            onPress={() => setPhotoUri(null)}
          >
            <Text style={styles.photoCloseText}>{t.closePhoto}</Text>
          </Pressable>
        </View>
      </Modal>

      <StaffNav
        lang={lang}
        setLang={setLang}
        nickname={nickname}
        logoutLabel={t.logout}
        backLabel={t.back}
        cashierActive
        onOpenKitchen={onOpenKitchen}
        onLogout={onLogout}
      />

      <Pressable
        style={({ pressed }) => [
          styles.backBtn,
          pressed && styles.backBtnPressed,
        ]}
        onPress={onBack}
        accessibilityLabel={t.back}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={20}
          color={colors.primary}
        />
        <Text style={styles.backBtnText}>{t.back}</Text>
      </Pressable>

      <Text style={styles.modeTitle}>{t.title}</Text>

      <View style={styles.groupRow}>
        <Text style={styles.groupLabel}>{t.groupBy}</Text>
        <View style={styles.groupToggle}>
          <Pressable
            style={({ pressed }) => [
              styles.groupChip,
              groupMode === 'time' && styles.groupChipActive,
              pressed && styles.groupChipPressed,
            ]}
            onPress={() => setGroupMode('time')}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={groupMode === 'time' ? '#111111' : colors.primary}
            />
            <Text
              style={[
                styles.groupChipText,
                groupMode === 'time' && styles.groupChipTextActive,
              ]}
            >
              {t.groupTime}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.groupChip,
              groupMode === 'staff' && styles.groupChipActive,
              pressed && styles.groupChipPressed,
            ]}
            onPress={() => setGroupMode('staff')}
          >
            <MaterialCommunityIcons
              name="account-outline"
              size={16}
              color={groupMode === 'staff' ? '#111111' : colors.primary}
            />
            <Text
              style={[
                styles.groupChipText,
                groupMode === 'staff' && styles.groupChipTextActive,
              ]}
            >
              {t.groupStaff}
            </Text>
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        extraData={expandedIds}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>{t.empty}</Text>}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const expanded = !!expandedIds[item.id];
          const foodLines = item.lines.filter((l) => l.menuItemId !== 'egg');
          const total = ticketTotal(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.metaLeft}>
                  <View style={styles.nameRow}>
                    <Text style={styles.staffName} numberOfLines={1}>
                      {staffLabel(item, t.unknownStaff)}
                    </Text>
                    <Text style={styles.orderTime}>
                      {formatOrderTime(item.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.tableName} numberOfLines={1}>
                    {item.table}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.moreBtn,
                    pressed && styles.moreBtnPressed,
                  ]}
                  onPress={() => toggleExpanded(item.id)}
                >
                  <Text style={styles.moreBtnText}>
                    {expanded ? t.hide : t.more}
                  </Text>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              </View>

              {paymentBar(item, total)}

              {expanded
                ? foodLines.map((line) => {
                    const served = lineIsDone(line);
                    return (
                      <View key={line.id} style={styles.lineRow}>
                        <Text
                          style={[
                            styles.lineName,
                            served && styles.lineNameDone,
                          ]}
                          numberOfLines={2}
                        >
                          {lineLabel(line)} ×{line.quantity}
                          {(line.eggCount ?? 0) > 0
                            ? ` · +ไข่×${line.eggCount}`
                            : ''}
                        </Text>
                        <Text
                          style={[
                            styles.lineStatus,
                            served
                              ? styles.statusServed
                              : styles.statusPending,
                          ]}
                        >
                          {served ? t.served : t.pendingServe}
                        </Text>
                      </View>
                    );
                  })
                : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    gap: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,230,0,0.12)',
  },
  backBtnPressed: {
    opacity: 0.85,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  modeTitle: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  groupLabel: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '700',
  },
  groupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  groupChipActive: {
    backgroundColor: colors.primary,
  },
  groupChipPressed: {
    opacity: 0.85,
  },
  groupChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  groupChipTextActive: {
    color: '#111111',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionCount: {
    color: '#777777',
    fontSize: 13,
    fontWeight: '700',
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaLeft: {
    flex: 1,
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
    fontSize: 14,
    fontWeight: '600',
  },
  orderTime: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '500',
  },
  tableName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
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
  payBarQr: {
    backgroundColor: '#81C784',
  },
  payBarCashUnpaid: {
    backgroundColor: '#FFB74D',
  },
  payBarCashPaid: {
    backgroundColor: '#2E7D32',
  },
  payBarText: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '600',
    flex: 1,
  },
  payBarTextOnDark: {
    color: '#FFFFFF',
  },
  payBarAmount: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '400',
    marginLeft: 'auto',
  },
  markPaidBtn: {
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
    fontSize: 13,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  actionRowPrimary: {
    flex: 1,
  },
  viewPhotoInlineBtn: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,230,0,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  viewPhotoInlineText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  paidBtn: {
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,230,0,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 9,
  },
  paidBtnPressed: {
    opacity: 0.85,
  },
  paidBtnDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,230,0,0.45)',
  },
  paidBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  photoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
    gap: 16,
  },
  photoPreview: {
    width: '100%',
    flex: 1,
    borderRadius: 12,
  },
  photoCloseBtn: {
    minHeight: 44,
    minWidth: 120,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  photoCloseText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  moreBtnPressed: {
    opacity: 0.85,
  },
  moreBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  lineName: {
    flex: 1,
    color: '#EEEEEE',
    fontSize: 14,
    fontWeight: '600',
  },
  lineNameDone: {
    color: '#9A9A9A',
    textDecorationLine: 'line-through',
  },
  lineStatus: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusServed: {
    color: '#81C784',
  },
  statusPending: {
    color: '#FFB74D',
  },
});
