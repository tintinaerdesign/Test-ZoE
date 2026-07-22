import type {
  CashPayStatus,
  KitchenLine,
  KitchenTicket,
  OrderType,
  PaymentMethod,
  TicketStatus,
} from '../data/kitchen';
import { getSupabase, isSupabaseConfigured } from './supabase';

/** Row shape in public.orders (see supabase/schema.sql). */
export type OrderRow = {
  id: string;
  order_no: string;
  table_label: string;
  order_type: OrderType;
  created_at: number;
  status: TicketStatus;
  serve_complete: boolean;
  staff_name: string | null;
  payment_method: PaymentMethod | null;
  cash_status: CashPayStatus | null;
  payment_evidence_uri: string | null;
  lines: KitchenLine[];
};

export function ticketToRow(ticket: KitchenTicket): OrderRow {
  return {
    id: ticket.id,
    order_no: ticket.orderNo,
    table_label: ticket.table,
    order_type: ticket.type,
    created_at: ticket.createdAt,
    status: ticket.status,
    serve_complete: ticket.serveComplete === true,
    staff_name: ticket.staffName?.trim() || null,
    payment_method: ticket.paymentMethod ?? null,
    cash_status: ticket.cashStatus ?? null,
    payment_evidence_uri: ticket.paymentEvidenceUri ?? null,
    lines: ticket.lines,
  };
}

export function rowToTicket(row: OrderRow): KitchenTicket {
  return {
    id: row.id,
    orderNo: row.order_no,
    table: row.table_label ?? '',
    type: row.order_type === 'take_away' ? 'take_away' : 'dine_in',
    createdAt: Number(row.created_at) || Date.now(),
    status:
      row.status === 'cooking' || row.status === 'ready' ? row.status : 'queued',
    serveComplete: row.serve_complete === true,
    staffName: row.staff_name ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    cashStatus: row.cash_status ?? undefined,
    paymentEvidenceUri: row.payment_evidence_uri ?? undefined,
    lines: Array.isArray(row.lines) ? row.lines : [],
  };
}

/** Stable snapshot for equality checks (avoids sync loops). */
export function ticketsFingerprint(tickets: KitchenTicket[]): string {
  return JSON.stringify(tickets.map(ticketToRow));
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Load all orders from Supabase (newest first). */
export async function fetchOrdersFromSupabase(): Promise<KitchenTicket[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      8000,
      'fetchOrders',
    );

    if (error) {
      if (__DEV__) {
        console.warn('[ZoeOrders] fetch failed:', error.message);
      }
      return null;
    }

    return (data as OrderRow[]).map(rowToTicket);
  } catch (e) {
    if (__DEV__) {
      console.warn('[ZoeOrders] fetch error:', e);
    }
    return null;
  }
}

/**
 * Push full ticket list to Supabase:
 * upsert current rows, delete remote ids that local no longer has.
 */
export async function pushOrdersToSupabase(
  tickets: KitchenTicket[],
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const rows = tickets.map(ticketToRow);
  const keepIds = new Set(tickets.map((t) => t.id));

  try {
    if (rows.length > 0) {
      const { error: upsertError } = await withTimeout(
        supabase.from('orders').upsert(rows, { onConflict: 'id' }),
        8000,
        'upsertOrders',
      );
      if (upsertError) {
        if (__DEV__) {
          console.warn('[ZoeOrders] upsert failed:', upsertError.message);
        }
        return false;
      }
    }

    const { data: existing, error: listError } = await withTimeout(
      supabase.from('orders').select('id'),
      8000,
      'listOrderIds',
    );
    if (listError) {
      if (__DEV__) {
        console.warn('[ZoeOrders] list ids failed:', listError.message);
      }
      return false;
    }

    const toDelete = (existing ?? [])
      .map((r) => r.id as string)
      .filter((id) => !keepIds.has(id));

    if (toDelete.length > 0) {
      const { error: deleteError } = await withTimeout(
        supabase.from('orders').delete().in('id', toDelete),
        8000,
        'deleteOrders',
      );
      if (deleteError) {
        if (__DEV__) {
          console.warn('[ZoeOrders] delete failed:', deleteError.message);
        }
        return false;
      }
    }

    return true;
  } catch (e) {
    if (__DEV__) {
      console.warn('[ZoeOrders] push error:', e);
    }
    return false;
  }
}

/** Live updates when another device changes orders. */
export function subscribeOrders(
  onChange: (tickets: KitchenTicket[]) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return () => undefined;
  }

  let cancelled = false;
  let fetchGen = 0;

  const channel = supabase
    .channel('zoe-orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => {
        const gen = ++fetchGen;
        void fetchOrdersFromSupabase().then((tickets) => {
          if (cancelled || gen !== fetchGen || !tickets) return;
          onChange(tickets);
        });
      },
    )
    .subscribe((status) => {
      if (__DEV__ && status === 'SUBSCRIBED') {
        console.log('[ZoeOrders] realtime subscribed');
      }
    });

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
}
