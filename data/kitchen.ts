import { findMenuItem, type KitchenStation } from './menu';

export type { KitchenStation };

export type OrderType = 'dine_in' | 'take_away';
export type TicketStatus = 'queued' | 'cooking' | 'ready';
export type PaymentMethod = 'qr' | 'cash';
/** Cash only — unpaid vs settled at cashier. */
export type CashPayStatus = 'unpaid' | 'paid_at_cashier';

export type KitchenLine = {
  id: string;
  menuItemId: string;
  name: string;
  nameTh: string;
  quantity: number;
  station: KitchenStation;
  /** How many portions are actively cooking. */
  cooking: number;
  /** Portion(s) ready to serve (e.g. fries done, curry still cooking). */
  isReady?: boolean;
  optionLabel?: string;
  optionLabelTh?: string;
  note?: string;
  /** Fried-egg addons to put on this plate (not a separate kitchen line). */
  eggCount?: number;
};

export type KitchenTicket = {
  id: string;
  orderNo: string;
  table: string;
  type: OrderType;
  createdAt: number;
  status: TicketStatus;
  /** true = ครบแล้ว, false = ยังไม่ครบ (partial ready). */
  serveComplete?: boolean;
  /** Waiter / staff who placed the order. */
  staffName?: string;
  paymentMethod?: PaymentMethod;
  /** Only when paymentMethod === 'cash'. */
  cashStatus?: CashPayStatus;
  /** Back-camera payment evidence saved under app document storage. */
  paymentEvidenceUri?: string;
  lines: KitchenLine[];
};

/** Line ready to serve (kitchen ✓ or fully cooked). */
export function lineIsDone(line: KitchenLine) {
  const cooking = Number(line.cooking) || 0;
  const quantity = Number(line.quantity) || 0;
  return line.isReady === true || cooking >= quantity;
}

/** Complete when every food line looks done (✓). Ignore standalone egg lines. */
export function isTicketComplete(ticket: KitchenTicket) {
  const foodLines = ticket.lines.filter((l) => l.menuItemId !== 'egg');
  return foodLines.length > 0 && foodLines.every(lineIsDone);
}

const now = Date.now();

/** Demo rush: many overlapping snack/main orders at once. */
export const SAMPLE_KITCHEN_TICKETS: KitchenTicket[] = [
  {
    id: 't1',
    orderNo: '001',
    table: '5',
    type: 'dine_in',
    createdAt: now - 9 * 60_000,
    status: 'cooking',
    lines: [
      {
        id: 't1-1',
        menuItemId: '9',
        name: 'French Fries',
        nameTh: 'เฟรนฟราย',
        quantity: 1,
        cooking: 1,
        station: 'snack',
      },
      {
        id: 't1-2',
        menuItemId: '18',
        name: 'Chicken Wings',
        nameTh: 'ปีกไก่',
        quantity: 1,
        cooking: 1,
        station: 'snack',
      },
    ],
  },
  {
    id: 't2',
    orderNo: '002',
    table: '2',
    type: 'take_away',
    createdAt: now - 8 * 60_000,
    status: 'queued',
    lines: [
      {
        id: 't2-1',
        menuItemId: '9',
        name: 'French Fries',
        nameTh: 'เฟรนฟราย',
        quantity: 2,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't2-2',
        menuItemId: '14',
        name: 'Edamame',
        nameTh: 'ถั่วแระ',
        quantity: 2,
        cooking: 0,
        station: 'snack',
      },
    ],
  },
  {
    id: 't3',
    orderNo: '003',
    table: '8',
    type: 'dine_in',
    createdAt: now - 7 * 60_000,
    status: 'queued',
    lines: [
      {
        id: 't3-1',
        menuItemId: '14',
        name: 'Edamame',
        nameTh: 'ถั่วแระ',
        quantity: 1,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't3-2',
        menuItemId: '5',
        name: 'Fried Rice',
        nameTh: 'ข้าวผัด',
        quantity: 2,
        cooking: 0,
        station: 'main',
        optionLabel: 'Egg',
        optionLabelTh: 'ไข่',
      },
    ],
  },
  {
    id: 't4',
    orderNo: '004',
    table: '3',
    type: 'dine_in',
    createdAt: now - 6 * 60_000,
    status: 'queued',
    lines: [
      {
        id: 't4-1',
        menuItemId: '9',
        name: 'French Fries',
        nameTh: 'เฟรนฟราย',
        quantity: 1,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't4-2',
        menuItemId: '2',
        name: 'Rice Topped with Basil',
        nameTh: 'กะเพรา',
        quantity: 1,
        cooking: 0,
        station: 'main',
        optionLabel: 'Pork',
        optionLabelTh: 'หมู',
      },
    ],
  },
  {
    id: 't5',
    orderNo: '005',
    table: '11',
    type: 'take_away',
    createdAt: now - 5 * 60_000,
    status: 'cooking',
    lines: [
      {
        id: 't5-1',
        menuItemId: '18',
        name: 'Chicken Wings',
        nameTh: 'ปีกไก่',
        quantity: 2,
        cooking: 1,
        station: 'snack',
      },
      {
        id: 't5-2',
        menuItemId: '1',
        name: 'Pad Thai',
        nameTh: 'ผัดไทย',
        quantity: 1,
        cooking: 1,
        station: 'main',
        optionLabel: 'Chicken',
        optionLabelTh: 'ไก่',
      },
    ],
  },
  {
    id: 't6',
    orderNo: '006',
    table: '7',
    type: 'dine_in',
    createdAt: now - 4 * 60_000,
    status: 'queued',
    lines: [
      {
        id: 't6-1',
        menuItemId: '12',
        name: 'Nuggets',
        nameTh: 'นักเก็ต',
        quantity: 2,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't6-2',
        menuItemId: '5',
        name: 'Fried Rice',
        nameTh: 'ข้าวผัด',
        quantity: 1,
        cooking: 0,
        station: 'main',
        optionLabel: 'Pork',
        optionLabelTh: 'หมู',
      },
    ],
  },
  {
    id: 't7',
    orderNo: '007',
    table: '1',
    type: 'dine_in',
    createdAt: now - 3 * 60_000,
    status: 'queued',
    lines: [
      {
        id: 't7-1',
        menuItemId: '14',
        name: 'Edamame',
        nameTh: 'ถั่วแระ',
        quantity: 1,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't7-2',
        menuItemId: '9',
        name: 'French Fries',
        nameTh: 'เฟรนฟราย',
        quantity: 1,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't7-3',
        menuItemId: '2',
        name: 'Rice Topped with Basil',
        nameTh: 'กะเพรา',
        quantity: 2,
        cooking: 0,
        station: 'main',
        optionLabel: 'Chicken',
        optionLabelTh: 'ไก่',
      },
    ],
  },
  {
    id: 't8',
    orderNo: '008',
    table: '9',
    type: 'take_away',
    createdAt: now - 2 * 60_000,
    status: 'queued',
    lines: [
      {
        id: 't8-1',
        menuItemId: '10',
        name: 'Crispy Chicken',
        nameTh: 'ไก่กรอบ',
        quantity: 1,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't8-2',
        menuItemId: '5',
        name: 'Fried Rice',
        nameTh: 'ข้าวผัด',
        quantity: 1,
        cooking: 0,
        station: 'main',
        optionLabel: 'Egg',
        optionLabelTh: 'ไข่',
      },
    ],
  },
  {
    id: 't9',
    orderNo: '009',
    table: '4',
    type: 'dine_in',
    createdAt: now - 90_000,
    status: 'queued',
    lines: [
      {
        id: 't9-1',
        menuItemId: '9',
        name: 'French Fries',
        nameTh: 'เฟรนฟราย',
        quantity: 2,
        cooking: 0,
        station: 'snack',
      },
      {
        id: 't9-2',
        menuItemId: 'egg',
        name: 'Egg',
        nameTh: 'ไข่',
        quantity: 2,
        cooking: 0,
        station: 'main',
      },
    ],
  },
  {
    id: 't10',
    orderNo: '010',
    table: '6',
    type: 'dine_in',
    createdAt: now - 16 * 60_000,
    status: 'ready',
    serveComplete: false,
    lines: [
      {
        id: 't10-1',
        menuItemId: '9',
        name: 'French Fries',
        nameTh: 'เฟรนฟราย',
        quantity: 1,
        cooking: 0,
        isReady: true,
        station: 'snack',
      },
      {
        id: 't10-2',
        menuItemId: '7',
        name: 'Green Curry',
        nameTh: 'แกงเขียวหวาน',
        quantity: 1,
        cooking: 0,
        isReady: false,
        station: 'main',
      },
    ],
  },
];

export const STATION_META = {
  snack: {
    id: 'snack' as const,
    name: 'Snacks',
    nameTh: 'ของทานเล่น',
    color: '#E53935',
    icon: 'french-fries' as const,
  },
  main: {
    id: 'main' as const,
    name: 'Mains',
    nameTh: 'อาหารจานหลัก',
    color: '#FB8C00',
    icon: 'pot-steam' as const,
  },
};

/** Build a kitchen ticket from the waiter cart after ConfirmOrder succeeds. */
export function createKitchenTicketFromCart(
  cart: Record<string, number>,
  table: string,
  orderNo: string,
  cartNotes: Record<string, string> = {},
  cartEggs: Record<string, number> = {},
  meta: {
    staffName?: string;
    paymentMethod?: PaymentMethod;
    paymentEvidenceUri?: string;
  } = {},
): KitchenTicket | null {
  const lines: KitchenLine[] = [];
  let index = 0;
  const stamp = Date.now();

  for (const [key, quantity] of Object.entries(cart)) {
    if (quantity <= 0) continue;
    const [menuItemId, optionId] = key.split(':');
    // Egg addon is attached to dishes — never its own kitchen line.
    if (menuItemId === 'egg') continue;
    const item = findMenuItem(menuItemId);
    if (!item || item.id === 'egg') continue;
    const option = optionId
      ? item.options?.find((entry) => entry.id === optionId)
      : undefined;
    const note = cartNotes[key]?.trim();
    const eggs = cartEggs[key] ?? 0;

    lines.push({
      id: `l-${stamp}-${index++}`,
      menuItemId: item.id,
      name: item.name,
      nameTh: item.nameTh,
      quantity,
      cooking: 0,
      station: item.station ?? 'main',
      optionLabel: option?.name,
      optionLabelTh: option?.nameTh,
      note: note || undefined,
      eggCount: eggs > 0 ? eggs : undefined,
    });
  }

  if (lines.length === 0) return null;

  const paymentMethod = meta.paymentMethod;
  return {
    id: `live-${stamp}`,
    orderNo,
    table: table.trim() || '?',
    type: 'dine_in',
    createdAt: stamp,
    status: 'queued',
    staffName: meta.staffName?.trim() || undefined,
    paymentMethod,
    cashStatus: paymentMethod === 'cash' ? 'unpaid' : undefined,
    paymentEvidenceUri: meta.paymentEvidenceUri || undefined,
    lines,
  };
}
