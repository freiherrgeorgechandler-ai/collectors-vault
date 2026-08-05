import { CategoryInfo, CategoryType } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'vinyl',
    name: 'Vinyl',
    iconName: 'Disc',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    description: 'LPs, 45s, 78s & Limited Vinyl Releases',
    defaultFormat: '12" LP 33 RPM',
  },
  {
    id: 'painting',
    name: 'Painting',
    iconName: 'Palette',
    color: 'text-rose-600',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
    borderColor: 'border-rose-500/30',
    description: 'Fine Art, Oils, Watercolors & Canvas',
    defaultFormat: 'Oil on Canvas',
  },
  {
    id: 'cd',
    name: 'CD',
    iconName: 'Disc3',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    description: 'Compact Discs, Box Sets & SACDs',
    defaultFormat: 'Standard CD',
  },
  {
    id: 'dvd',
    name: 'DVD',
    iconName: 'Film',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
    description: 'DVD Movies, TV Shows & Documentaries',
    defaultFormat: 'DVD Region Free',
  },
  {
    id: 'bluray',
    name: 'Blu-ray',
    iconName: 'Tv',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    description: '4K UHD, Blu-ray & Collector Steelbooks',
    defaultFormat: '4K UHD Blu-ray',
  },
  {
    id: 'cassette',
    name: 'Cassette',
    iconName: 'Cassette',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    description: 'Audio Tapes, Mixtapes & Vintage Cassettes',
    defaultFormat: 'Standard Audio Cassette',
  },
  {
    id: 'chinese_tea',
    name: 'Chinese Tea',
    iconName: 'Leaf',
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10 dark:bg-teal-500/20',
    borderColor: 'border-teal-500/30',
    description: 'Puer Cakes, Oolong, Wuyi Rock Tea & Aged Leaves',
    defaultFormat: '357g Tea Cake',
  },
  {
    id: 'wine',
    name: 'Wine',
    iconName: 'Wine',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    description: 'Fine Vintage Wines, Vintages & Cellar Bottles',
    defaultFormat: '750ml Bottle',
  },
  {
    id: 'teapot',
    name: 'Teapot',
    iconName: 'Coffee',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    description: 'Yixing Zisha Clay, Zhuni, Master Pots & Antiques',
    defaultFormat: 'Yixing Zisha Clay',
  },
];

export const CATEGORY_MAP: Record<CategoryType, CategoryInfo> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryType, CategoryInfo>
);

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'HKD', symbol: 'HK$', label: 'HKD (HK$)' },
  { code: 'CNY', symbol: '¥', label: 'CNY (¥)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$)' },
  { code: 'MYR', symbol: 'RM', label: 'MYR (RM)' },
  { code: 'TWD', symbol: 'NT$', label: 'TWD (NT$)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
];

export const PRESET_CONDITIONS = [
  'Mint',
  'Near Mint',
  'Very Good',
  'Good',
  'Fair',
  'Aged/Vintage',
  'New/Sealed',
];

export const MEDIA_GENRES = [
  'Classical',
  'Jazz',
  'Rock',
  'Pop',
  'Soul / Funk',
  'Traditional Chinese',
  'Blues',
  'Hip Hop',
  'Electronic',
  'Soundtrack',
  'Action / Sci-Fi',
  'Drama',
  'Documentary',
  'World Music',
];

export const TEA_TYPES = [
  'Puer Raw (Sheng Puer)',
  'Puer Ripe (Shou Puer)',
  'Oolong (Wuyi Dahongpao / Tieguanyin)',
  'Green Tea (Longjing / Biluochun)',
  'White Tea (Fuding Silver Needle)',
  'Black Tea (Lapsang Souchong / Dianhong)',
  'Dark Tea (Anhua Hei Cha / Liubao)',
  'Yellow Tea',
];

export const CLAY_TYPES = [
  'Zini (Purple Mud)',
  'Zhuni (Cinnabar Clay)',
  'Duanni (Fortified Clay)',
  'Dahongpao Clay',
  'Lüni (Green Clay)',
  'Qinghuani (Blue-Green Clay)',
  'Yixing Zisha Blend',
  'Jingdezhen Porcelain',
  'Chaozhou Clay',
];

export const WINE_TYPES = [
  'Red Wine (Bordeaux / Burgundy style)',
  'White Wine (Chardonnay / Riesling)',
  'Rosé Wine',
  'Sparkling / Champagne',
  'Fortified / Port / Sherry',
  'Dessert / Icewine',
];

export const PAINTING_MEDIUMS = [
  'Oil on Canvas',
  'Chinese Ink & Wash on Xuan Paper',
  'Acrylic on Linen',
  'Watercolor on Paper',
  'Mixed Media & Collage',
  'Giclée Fine Art Print',
  'Silk Painting',
];
