import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KitchenTicket } from '../data/kitchen';

const TICKETS_KEY = 'zoe.kitchenTickets';

export async function loadKitchenTickets(): Promise<KitchenTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as KitchenTicket[]) : [];
  } catch {
    return [];
  }
}

/** Persist full ticket history (UI may hide older/paid cards; storage keeps all). */
export async function saveKitchenTickets(
  tickets: KitchenTicket[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // Best-effort persistence.
  }
}
