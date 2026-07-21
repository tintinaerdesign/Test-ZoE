/**
 * Shared key ingredients used across multiple dishes.
 * Kitchen can toggle these off when stock runs out.
 */
export const INGREDIENT_SUBSETS = [
  'หมูสับ',
  'หมูชิ้น',
  'หมูยอ',
  'ไก่',
  'เส้นผัดไทย',
  'เส้นสปาเก็ตตี้',
  'เบค่อน',
  'ไข่',
  'วุ้นเส้น',
  'กุ้งขาวเล็ก',
] as const;

export type IngredientSubset = (typeof INGREDIENT_SUBSETS)[number];

/**
 * Default option id → ingredients (when menu option omits `ingredients`).
 * Dish-specific overrides live on MenuOption.ingredients.
 */
export const OPTION_INGREDIENTS: Record<
  string,
  readonly IngredientSubset[]
> = {
  pork: ['หมูชิ้น'],
  'minced-pork': ['หมูสับ'],
  'pork-slice': ['หมูชิ้น'],
  'moo-yor': ['หมูยอ'],
  'minced-pork-moo-yor': ['หมูสับ', 'หมูยอ'],
  chicken: ['ไก่'],
  egg: ['ไข่'],
  carbonara: ['เบค่อน', 'เส้นสปาเก็ตตี้', 'ไข่'],
  'spicy spaghetti': ['เส้นสปาเก็ตตี้'],
};

export function ingredientsForOption(option: {
  id: string;
  ingredients?: readonly IngredientSubset[];
}): readonly IngredientSubset[] {
  if (option.ingredients && option.ingredients.length > 0) {
    return option.ingredients;
  }
  return OPTION_INGREDIENTS[option.id] ?? [];
}

/** True when every required ingredient is still in stock. */
export function isOptionAvailable(
  option: { id: string; ingredients?: readonly IngredientSubset[] },
  unavailableIngredients: readonly string[],
): boolean {
  const needed = ingredientsForOption(option);
  if (needed.length === 0) return true;
  const unavailable = new Set(unavailableIngredients);
  return needed.every((name) => !unavailable.has(name));
}
