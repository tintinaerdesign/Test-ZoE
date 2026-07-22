import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KitchenTicket } from '../data/kitchen';
import {
  fetchOrdersFromSupabase,
  pushOrdersToSupabase,
  subscribeOrders,
  ticketsFingerprint,
} from './orderSync';
import { isSupabaseConfigured } from './supabase';

const TICKETS_KEY = 'zoe.kitchenTickets';

/** Last payload we successfully pushed — skip identical remote writes. */
let lastPushedFingerprint = '';
/** True while we are applying a remote snapshot (don't push back). */
let suppressRemotePush = false;

async function loadLocalTickets(): Promise<KitchenTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as KitchenTicket[]) : [];
  } catch {
    return [];
  }
}

async function saveLocalTickets(tickets: KitchenTicket[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // Best-effort.
  }
}

/**
 * Load tickets — prefer Supabase when configured, else local AsyncStorage.
 * Falls back to local if remote fetch fails.
 */
export async function loadKitchenTickets(): Promise<KitchenTicket[]> {
  if (isSupabaseConfigured()) {
    const remote = await fetchOrdersFromSupabase();
    if (remote) {
      lastPushedFingerprint = ticketsFingerprint(remote);
      await saveLocalTickets(remote);
      return remote;
    }
  }
  const local = await loadLocalTickets();
  lastPushedFingerprint = ticketsFingerprint(local);
  return local;
}

/**
 * Persist locally always; push to Supabase only when data actually changed
 * and we are not applying a remote update (prevents freeze loops).
 */
export async function saveKitchenTickets(
  tickets: KitchenTicket[],
): Promise<void> {
  await saveLocalTickets(tickets);

  if (!isSupabaseConfigured() || suppressRemotePush) return;

  const fingerprint = ticketsFingerprint(tickets);
  if (fingerprint === lastPushedFingerprint) return;

  const ok = await pushOrdersToSupabase(tickets);
  if (ok) {
    lastPushedFingerprint = fingerprint;
  }
}

/**
 * Subscribe to multi-device order changes (no-op if Supabase not configured).
 * Skips callbacks when the snapshot matches what we already have / just pushed.
 */
export function subscribeKitchenTickets(
  onChange: (tickets: KitchenTicket[]) => void,
): () => void {
  if (!isSupabaseConfigured()) return () => undefined;

  return subscribeOrders((tickets) => {
    const fingerprint = ticketsFingerprint(tickets);
    if (fingerprint === lastPushedFingerprint) return;

    suppressRemotePush = true;
    lastPushedFingerprint = fingerprint;
    try {
      onChange(tickets);
    } finally {
      // Keep suppress on until after React save effects flush.
      setTimeout(() => {
        suppressRemotePush = false;
      }, 500);
    }
  });
}

export { isSupabaseConfigured };
