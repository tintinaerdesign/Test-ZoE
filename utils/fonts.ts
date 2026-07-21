type FontWeight = TextStyleLike['fontWeight'];

type TextStyleLike = {
  fontFamily?: string;
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900
    | string
    | number;
  [key: string]: unknown;
};

/** LINE Seed Sans TH — single family for the whole app (EN + TH). */
export const lineFonts = {
  regular: 'LINESeedSansTH',
  bold: 'LINESeedSansTH-Bold',
  extraBold: 'LINESeedSansTH-ExtraBold',
} as const;

export const lineFontSources = {
  [lineFonts.regular]: require('../assets/fonts/LINESeedSansTH-Regular.ttf'),
  [lineFonts.bold]: require('../assets/fonts/LINESeedSansTH-Bold.ttf'),
  [lineFonts.extraBold]: require('../assets/fonts/LINESeedSansTH-ExtraBold.ttf'),
};

function flattenStyle(style: unknown): TextStyleLike {
  if (style == null || style === false) return {};
  if (Array.isArray(style)) {
    return style.reduce<TextStyleLike>(
      (acc, entry) => ({ ...acc, ...flattenStyle(entry) }),
      {},
    );
  }
  if (typeof style === 'object') return style as TextStyleLike;
  return {};
}

/** Map numeric/CSS weight → LINE Seed face (never fall back to system font). */
export function lineFamilyForWeight(fontWeight?: FontWeight): string {
  if (fontWeight == null || fontWeight === 'normal' || fontWeight === '400') {
    return lineFonts.regular;
  }
  if (fontWeight === 'bold') return lineFonts.bold;
  const n =
    typeof fontWeight === 'number'
      ? fontWeight
      : parseInt(String(fontWeight), 10);
  if (!Number.isFinite(n) || n < 600) return lineFonts.regular;
  if (n >= 800) return lineFonts.extraBold;
  return lineFonts.bold;
}

/**
 * Force LINE Seed on every Text. Android ignores custom fonts when fontWeight
 * is set — swap to the matching .ttf and clear fontWeight.
 */
export function withLineSeedStyle(style: unknown): unknown {
  const flat = flattenStyle(style);
  return [
    style,
    {
      fontFamily: lineFamilyForWeight(flat.fontWeight as FontWeight),
      fontWeight: 'normal',
    },
  ];
}

export function lineTextStyle(_lang?: 'en' | 'th') {
  return { fontFamily: lineFonts.regular } as const;
}

export function lineBoldStyle(_lang?: 'en' | 'th') {
  return { fontFamily: lineFonts.bold, fontWeight: 'normal' as const };
}

/** True after expo-font has loaded LINE Seed faces. */
let lineSeedReady = false;

export function setLineSeedActive(active: boolean) {
  lineSeedReady = active;
}

export function isLineSeedActive() {
  return lineSeedReady;
}
