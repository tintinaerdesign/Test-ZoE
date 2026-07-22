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
    cashPaid: 'Paid',
    payQr: 'Paid by QR',
    markPaid: 'Confirm payment at cashier',
    latest: 'Latest',
    logout: 'Logout',
  },
  th: {
    placeOrder: 'Place Order',
    empty: 'ยังไม่มีออเดอร์',
    cashUnpaid: 'ยังไม่จ่าย',
    cashPaid: 'ชำระเงินแล้ว',
    payQr: 'ชำระด้วย QR',
    markPaid: 'ยืนยันชำระที่แคชเชียร์',
    latest: 'ล่าสุด',
    logout: 'ออก',
  },
};

/** Waiter board keeps an order visible this long after it was placed. */
const ORDER_VISIBLE_MS = 60 * 60 * 1000;

function ticketTotal(ticket: KitchenTicket) {
  return ticket.lines.reduce((sum, line) => {
    if (line.menuItemId === 'egg') return sum;
    const item = findMenuItem(line.menuItemId);
    const unit = item?.price ?? 0;
    const eggs = (line.eggCount ?? 0) * EGG_ADDON.price;
    return sum + unit * line.quantity + eggs;
  }, 0);
}

function isCashUnpaid(ticket: KitchenTicket) {
  return (
    ticket.paymentMethod === 'cash' && ticket.cashStatus !== 'paid_at_cashier'
  );
}

type BillRowProps = {
  item: KitchenTicket;
  isLatest: boolean;
  cashUnpaidLabel: string;
  cashPaidLabel: string;
  payQrLabel: string;
  markPaidLabel: string;
  latestLabel: string;
  onMarkPaid: (ticketId: string) => void;
};

const OrderBillRow = memo(function OrderBillRow({
  item,
  isLatest,
  cashUnpaidLabel,
  cashPaidLabel,
  payQrLabel,
  markPaidLabel,
  latestLabel,
  onMarkPaid,
}: BillRowProps) {
  const total = useMemo(() => ticketTotal(item), [item]);
  const unpaid = isCashUnpaid(item);
  const isQr = item.paymentMethod === 'qr';

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
        <View
          style={[
            styles.payBar,
            isQr
              ? styles.payBarQr
              : unpaid
                ? styles.payBarCashUnpaid
                : styles.payBarCashPaid,
          ]}
        >
          <MaterialCommunityIcons
            name={isQr ? 'qrcode' : 'cash'}
            size={16}
            color={unpaid || isQr ? '#111111' : '#FFFFFF'}
          />
          <Text
            style={[styles.payBarText, !unpaid && !isQr && styles.payBarTextOnDark]}
          >
            {isQr ? payQrLabel : unpaid ? cashUnpaidLabel : cashPaidLabel}
          </Text>
          <Text
            style={[
              styles.payBarAmount,
              !unpaid && !isQr && styles.payBarTextOnDark,
            ]}
          >
            {formatBaht(total)}
          </Text>
        </View>
        {unpaid ? (
          <Pressable
            style={({ pressed }) => [
              styles.markPaidBtn,
              pressed && styles.markPaidBtnPressed,
            ]}
            onPress={() => onMarkPaid(item.id)}
          >
            <Text style={styles.markPaidText}>{markPaidLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

/**
 * Waiter home — Place Order + own orders from the last hour.
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
  /** Bumps so the 1-hour window re-filters without a full remount. */
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (readySent.current || !onReady) return;
    readySent.current = true;
    onReady();
  }, [onReady]);

  /** Drop cards when they age past 1 hour (check every 30s). */
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  /** Own tickets still within 1 hour of order time (paid ones stay visible too). */
  const ordered = useMemo(() => {
    const me = nickname?.trim().toLowerCase() ?? '';
    const cutoff = nowTick - ORDER_VISIBLE_MS;
    return tickets
      .filter((ticket) => {
        if (!me) return false;
        if ((ticket.staffName?.trim().toLowerCase() ?? '') !== me) return false;
        return ticket.createdAt >= cutoff;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tickets, nickname, nowTick]);

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
      <OrderBillRow
        item={item}
        isLatest={item.id === latestId}
        cashUnpaidLabel={t.cashUnpaid}
        cashPaidLabel={t.cashPaid}
        payQrLabel={t.payQr}
        markPaidLabel={t.markPaid}
        latestLabel={t.latest}
        onMarkPaid={openCashierPin}
      />
    ),
    [
      latestId,
      openCashierPin,
      t.cashPaid,
      t.cashUnpaid,
      t.latest,
      t.markPaid,
      t.payQr,
    ],
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
    fontWeight: '400',
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
