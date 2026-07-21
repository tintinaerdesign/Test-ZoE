import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'zoe.uiCache';

export type UiCache = {
  cart: Record<string, number>;
  cartNotes: Record<string, string>;
  cartEggs: Record<string, number>;
  tableNumber: string;
  lang: 'en' | 'th';
  orderSeq: number;
};

const EMPTY: UiCache = {
  cart: {},
  cartNotes: {},
  cartEggs: {},
  tableNumber: '',
  lang: 'en',
  orderSeq: 1,
};

export async function loadUiCache(): Promise<UiCache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<UiCache>;
    return {
      cart:
        parsed.cart && typeof parsed.cart === 'object' ? parsed.cart : {},
      cartNotes:
        parsed.cartNotes && typeof parsed.cartNotes === 'object'
          ? parsed.cartNotes
          : {},
      cartEggs:
        parsed.cartEggs && typeof parsed.cartEggs === 'object'
          ? parsed.cartEggs
          : {},
      tableNumber:
        typeof parsed.tableNumber === 'string' ? parsed.tableNumber : '',
      lang: parsed.lang === 'th' ? 'th' : 'en',
      orderSeq:
        typeof parsed.orderSeq === 'number' && parsed.orderSeq > 0
          ? Math.floor(parsed.orderSeq)
          : 1,
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveUiCache(cache: UiCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Best-effort.
  }
}
