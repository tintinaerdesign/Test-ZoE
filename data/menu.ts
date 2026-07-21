import type { ImageSourcePropType } from 'react-native';

import type { IngredientSubset } from './ingredients';

export type MenuOption = {
  id: string;
  name: string;
  nameTh: string;
  /** Key ingredients from INGREDIENT_SUBSETS required for this option. */
  ingredients?: IngredientSubset[];
  /** Show ★ — preferred / recommended choice. */
  recommended?: boolean;
};

/** Kitchen station — snacks on fryer, mains on stir-fry / stove. */
export type KitchenStation = 'snack' | 'main';

export type MenuItem = {
  id: string;
  name: string;
  nameTh: string;
  /** Extra search terms (EN/TH spellings). */
  aliases?: string[];
  price: number;
  image?: ImageSourcePropType;
  options?: MenuOption[];
  station?: KitchenStation;
};

/** Quick add-on from cart (not shown in main menu list). */
export const EGG_ADDON: MenuItem = {
  id: 'egg',
  name: 'Egg',
  nameTh: 'ไข่',
  price: 20,
  station: 'main',
};

export function findMenuItem(id: string): MenuItem | undefined {
  if (id === EGG_ADDON.id) return EGG_ADDON;
  return MENU.find((item) => item.id === id);
}

/**
 * Sample menu — bestsellers first for faster ordering.
 * 1 French Fries · 2 Crispy Chicken · 3 Edamame · 4 Basil ·
 * 5 Pad Thai · 6 Chicken Wings · 7 Cashew Nuts · then the rest.
 */
export const MENU: MenuItem[] = [
  {
    id: '9',
    name: 'French Fries',
    nameTh: 'เฟรนฟราย',
    price: 100,
    station: 'snack',
    image: require('../assets/FrenchFries.webp'),
  },
  {
    id: '10',
    name: 'Crispy Chicken',
    nameTh: 'ไก่กรอบ',
    price: 100,
    station: 'snack',
    image: require('../assets/crispyChicken.webp'),
  },
  {
    id: '14',
    name: 'Edamame',
    nameTh: 'ถั่วแระ',
    price: 80,
    station: 'snack',
    image: require('../assets/Edamame.webp'),
  },
  {
    id: '2',
    name: 'Rice Topped with Basil',
    nameTh: 'กะเพรา',
    price: 120,
    station: 'main',
    image: require('../assets/Basil.webp'),
    options: [
      {
        id: 'minced-pork',
        name: 'Minced pork',
        nameTh: 'หมูสับ',
        ingredients: ['หมูสับ'],
        recommended: true,
      },
      {
        id: 'chicken',
        name: 'Chicken',
        nameTh: 'ไก่',
        ingredients: ['ไก่'],
      },
      {
        id: 'pork-slice',
        name: 'Pork slices',
        nameTh: 'หมูชิ้น',
        ingredients: ['หมูชิ้น'],
      },
    ],
  },
  {
    id: '1',
    name: 'Pad Thai',
    nameTh: 'ผัดไทย',
    price: 120,
    station: 'main',
    image: require('../assets/padThai.webp'),
    options: [
      {
        id: 'pork-slice',
        name: 'Pork slices',
        nameTh: 'หมูชิ้น',
        ingredients: ['หมูชิ้น', 'เส้นผัดไทย'],
      },
      {
        id: 'chicken',
        name: 'Chicken',
        nameTh: 'ไก่',
        ingredients: ['ไก่', 'เส้นผัดไทย'],
      },
      {
        id: 'egg',
        name: 'Egg',
        nameTh: 'ไข่',
        ingredients: ['ไข่', 'เส้นผัดไทย'],
      },
    ],
  },
  {
    id: '18',
    name: 'Chicken Wings',
    nameTh: 'ปีกไก่',
    price: 150,
    station: 'snack',
    image: require('../assets/chickenWings.webp'),
  },
  {
    id: '13',
    name: 'Cashew Nuts',
    nameTh: 'มมม',
    price: 100,
    station: 'snack',
    image: require('../assets/cashewNut.webp'),
  },

  // Remaining mains
  {
    id: '3',
    name: 'Spaghetti',
    nameTh: 'สปาเก็ตตี้',
    price: 130,
    station: 'main',
    image: require('../assets/spaghetti.webp'),
    options: [
      {
        id: 'carbonara',
        name: 'Carbonara',
        nameTh: 'คาโบน่าร่า',
        ingredients: ['เบค่อน', 'เส้นสปาเก็ตตี้', 'ไข่'],
      },
      {
        id: 'spicy spaghetti',
        name: 'Spicy Spaghetti',
        nameTh: 'ผัดขี้เมา',
        ingredients: ['เส้นสปาเก็ตตี้'],
      },
    ],
  },
  {
    id: '4',
    name: 'Northern Thai Noodles',
    nameTh: 'ข้าวซอย',
    aliases: ['Khao soi', 'Kao Soi', 'ข้าวซอยไก่'],
    price: 150,
    station: 'main',
    image: require('../assets/khaoSoi.webp'),
  },
  {
    id: '5',
    name: 'Fried Rice',
    nameTh: 'ข้าวผัด',
    price: 120,
    station: 'main',
    image: require('../assets/friedRice.webp'),
    options: [
      {
        id: 'pork-slice',
        name: 'Pork slices',
        nameTh: 'หมูชิ้น',
        ingredients: ['หมูชิ้น'],
      },
      {
        id: 'chicken',
        name: 'Chicken',
        nameTh: 'ไก่',
        ingredients: ['ไก่'],
      },
      {
        id: 'egg',
        name: 'Egg',
        nameTh: 'ไข่',
        ingredients: ['ไข่'],
      },
    ],
  },
  {
    id: '22',
    name: 'Glass Noodle Salad',
    nameTh: 'ยำวุ้นเส้น',
    price: 120,
    station: 'main',
    image: require('../assets/YumWoonSen.webp'),
    options: [
      {
        id: 'minced-pork',
        name: 'Minced pork',
        nameTh: 'หมูสับ',
        ingredients: ['หมูสับ', 'วุ้นเส้น'],
        recommended: true,
      },
      {
        id: 'moo-yor',
        name: 'Vietnamese sausage',
        nameTh: 'หมูยอ',
        ingredients: ['หมูยอ', 'วุ้นเส้น'],
      },
      {
        id: 'minced-pork-moo-yor',
        name: 'Minced pork + Vietnamese sausage',
        nameTh: 'หมูสับ+หมูยอ',
        ingredients: ['หมูสับ', 'หมูยอ', 'วุ้นเส้น'],
      },
    ],
  },
  {
    id: '6',
    name: 'Spicy Prawn Soup',
    nameTh: 'ต้มยำกุ้ง',
    price: 180,
    station: 'main',
    image: require('../assets/TomYumKung.webp'),
  },
  {
    id: '7',
    name: 'Green Curry',
    nameTh: 'แกงเขียวหวาน',
    price: 150,
    station: 'main',
    image: require('../assets/greenCurry.webp'),
  },
  {
    id: '8',
    name: 'Hang Lay Curry',
    nameTh: 'แกงฮังเล',
    price: 150,
    station: 'main',
    image: require('../assets/HangLay.webp'),
  },

  // Remaining snacks
  {
    id: '11',
    name: 'Mixed Fries',
    nameTh: 'รวมทอด',
    price: 150,
    station: 'snack',
    image: require('../assets/mixedFries.webp'),
  },
  {
    id: '12',
    name: 'Nuggets',
    nameTh: 'นักเก็ต',
    price: 100,
    station: 'snack',
    image: require('../assets/nuggets.webp'),
  },
  {
    id: '15',
    name: 'Peanuts',
    nameTh: 'ถั่วทอด',
    price: 80,
    station: 'snack',
    image: require('../assets/peanut.webp'),
  },
  {
    id: '16',
    name: 'Raw Shrimp with Spicy Sauce',
    nameTh: 'กุ้งแช่น้ำปลา',
    price: 150,
    station: 'snack',
    image: require('../assets/freshShrimp.webp'),
  },
  {
    id: '17',
    name: 'Prawn Cracker',
    nameTh: 'ข้าวเกรียบกุ้ง',
    price: 100,
    station: 'snack',
    image: require('../assets/PrawnCracker.webp'),
  },
  {
    id: '19',
    name: 'Chicken Tenders',
    nameTh: 'เอ็นไก่',
    price: 100,
    station: 'snack',
    image: require('../assets/Tendons.webp'),
  },
  {
    id: '20',
    name: 'Deep Fried Marinated Beef',
    nameTh: 'เนื้อแดดเดียว',
    price: 150,
    station: 'snack',
    image: require('../assets/beef.webp'),
  },
  {
    id: '21',
    name: 'Egg',
    nameTh: 'ไข่',
    price: 20,
    station: 'snack',
    image: require('../assets/Egg.webp'),
  },
];
