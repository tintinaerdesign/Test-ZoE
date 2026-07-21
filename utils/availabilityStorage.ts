import AsyncStorage from '@react-native-async-storage/async-storage';

const UNAVAILABLE_KEY = 'zoe.unavailableMenuIds';
const UNAVAILABLE_INGREDIENTS_KEY = 'zoe.unavailableIngredients';

/** Menu item ids marked as out of ingredients (hidden from waiter menu). */
export async function loadUnavailableIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(UNAVAILABLE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function saveUnavailableIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(UNAVAILABLE_KEY, JSON.stringify(ids));
  } catch {
    // Best-effort persistence.
  }
}

/** Shared ingredient names marked out of stock (from INGREDIENT_SUBSETS). */
export async function loadUnavailableIngredients(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(UNAVAILABLE_INGREDIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function saveUnavailableIngredients(
  names: string[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      UNAVAILABLE_INGREDIENTS_KEY,
      JSON.stringify(names),
    );
  } catch {
    // Best-effort persistence.
  }
}
