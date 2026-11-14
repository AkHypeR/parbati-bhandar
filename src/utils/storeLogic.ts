export interface ProductVariety {
  id: string;
  label: string;
  price: number;
  mrp?: number | null;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp?: number | null;
  unit: string;
  inStock: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  /** Public, quantity-free low-stock signal returned to customer storefronts. */
  lowStock?: boolean;
  emoji: string;
  imageUrl?: string;
  badge?: string;
  isBestItem?: boolean;
  bestItemRank?: number | null;
  allowCustomWeights?: boolean;
  varieties?: ProductVariety[];
  updatedAt: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  mapsUrl: string;
  timings: string;
  rating: string;
  autoSchedule: boolean;
  isOpen: boolean;
  announcement: string;
  greetingTop?: string;
  greetingMain?: string;
  greetingBengali?: string;
  deliveryEtaMins?: string;
  showOccasionBanner?: boolean;
  /** Owner-curated Deals of the Day shelf. */
  dealsOfDayEnabled?: boolean;
  dealProductIds?: string[];
  christmasSpecialProductIds?: string[];
  /** Owner-editable heading for the customer-facing seasonal product shelf. */
  seasonalCollectionTitle?: string;
  /** Owner-selectable emoji used for the seasonal collection across the storefront. */
  seasonalCollectionIcon?: string;
  occasionTitle?: string;
  occasionSubtitle?: string;
  occasionTag?: string;
  occasionImageUrl?: string;
  storeWebsiteUrl?: string;
  scannerImageUrl?: string;
  scannerMode?: 'link' | 'upload';
}

export interface CartItem {
  cartKey: string;
  product: Product;
  selectedUnit: string;
  unitPrice: number;
  unitMrp?: number | null;
  qty: number;
}

export type CartMap = Record<string, CartItem>;

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'all', name: 'All Items (সব পণ্য)', icon: '🛒', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'Rice & Atta', name: 'Rice & Atta (চাল ও আটা)', icon: '🌾', color: 'bg-amber-100 text-amber-800' },
  { id: 'Dal & Pulses', name: 'Dal & Pulses (ডাল ও ছোলা)', icon: '🥣', color: 'bg-orange-100 text-orange-800' },
  { id: 'Mustard Oil & Ghee', name: 'Mustard Oil & Ghee (তেল ও ঘি)', icon: '🌻', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'Spices & Masala', name: 'Spices & Masala (মশলা)', icon: '🌶️', color: 'bg-red-100 text-red-800' },
  { id: 'Tea & Biscuits', name: 'Tea & Biscuits (চা ও বিস্কুট)', icon: '☕', color: 'bg-purple-100 text-purple-800' },
  { id: 'Dairy & Eggs', name: 'Dairy & Eggs (দুধ ও ডিম)', icon: '🥛', color: 'bg-blue-100 text-blue-800' },
  { id: 'Daily Essentials', name: 'Daily Essentials (নিত্যপ্রয়োজনীয়)', icon: '🧼', color: 'bg-teal-100 text-teal-800' },
  { id: 'Breakfast & Cereals', name: 'Breakfast & Cereals (সকালের খাবার ও সিরিয়াল)', icon: '🥣', color: 'bg-orange-100 text-orange-800' },
  { id: 'Snacks & Packaged Foods', name: 'Snacks & Packaged Foods (স্ন্যাকস ও প্যাকেটজাত খাবার)', icon: '🍪', color: 'bg-rose-100 text-rose-800' },
  { id: 'Personal Care', name: 'Personal Care (ব্যক্তিগত পরিচর্যা)', icon: '🧴', color: 'bg-pink-100 text-pink-800' },
  { id: 'Cleaning & Household', name: 'Cleaning & Household (পরিষ্কার ও গৃহস্থালি)', icon: '🧹', color: 'bg-cyan-100 text-cyan-800' },
  { id: 'Baby & Family Care', name: 'Baby & Family Care (শিশু ও পরিবার)', icon: '🍼', color: 'bg-violet-100 text-violet-800' },
];

export const UNITS: string[] = [
  '1 kg',
  '500g',
  '250g',
  '200g',
  '100g',
  '2 kg',
  '5 kg Pack',
  '10 kg Bag',
  '25 kg Bag',
  '1 Litre',
  '500ml',
  '250ml',
  'Packet',
  'Piece',
  'Pair (জোড়া)',
  'Dozen',
];

export const PRESET_TAGS: string[] = [
  'Burdwan Special',
  'Best Seller',
  '100% Pure',
  'Fresh Stock',
  'Premium Aroma',
  'Bengali Favourite',
  'Daily Rate',
  'New Arrival',
  'Wholesale Price',
  'Festival Offer',
];

export const PRESET_EMOJIS: { label: string; emoji: string }[] = [
  { label: 'Rice/Grains', emoji: '🌾' },
  { label: 'Atta/Flour', emoji: '🫓' },
  { label: 'Dal/Pulses', emoji: '🥣' },
  { label: 'Cooking Oil', emoji: '🌻' },
  { label: 'Ghee/Butter', emoji: '🧈' },
  { label: 'Spices/Chilli', emoji: '🌶️' },
  { label: 'Salt/Sugar', emoji: '🧂' },
  { label: 'Tea/Coffee', emoji: '☕' },
  { label: 'Biscuits/Snacks', emoji: '🍪' },
  { label: 'Noodles/Maggi', emoji: '🍜' },
  { label: 'Milk/Dairy', emoji: '🥛' },
  { label: 'Eggs', emoji: '🥚' },
  { label: 'Potato/Onion', emoji: '🥔' },
  { label: 'Garlic/Ginger', emoji: '🧄' },
  { label: 'Soap/Detergent', emoji: '🧼' },
  { label: 'Shopping Bag', emoji: '🛍️' },
];

const BASE_TIMESTAMP = 1762850000000;

export const INITIAL_SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'pb-item-1',
    name: 'Burdwan Special Miniket Rice (মিনিকেট চাল)',
    category: 'Rice & Atta',
    price: 56,
    mrp: 62,
    unit: '1 kg',
    inStock: true,
    stockQuantity: 45,
    lowStockThreshold: 10,
    emoji: '🌾',
    imageUrl: '',
    badge: 'Burdwan Special',
    isBestItem: true,
    bestItemRank: 1,
    allowCustomWeights: true,
    updatedAt: BASE_TIMESTAMP - 1000000,
  },
  {
    id: 'pb-item-2',
    name: 'Khas Gobindobhog Rice (গোবিন্দভোগ চাল)',
    category: 'Rice & Atta',
    price: 115,
    mrp: 130,
    unit: '1 kg',
    inStock: true,
    stockQuantity: 3,
    lowStockThreshold: 5,
    emoji: '🌾',
    imageUrl: '',
    badge: 'Premium Aroma',
    isBestItem: true,
    bestItemRank: 2,
    allowCustomWeights: true,
    updatedAt: BASE_TIMESTAMP - 2000000,
  },
  {
    id: 'pb-item-3',
    name: 'Fortune Kachi Ghani Mustard Oil (সর্ষের তেল)',
    category: 'Mustard Oil & Ghee',
    price: 168,
    mrp: 185,
    unit: '1 Litre',
    inStock: true,
    stockQuantity: 18,
    lowStockThreshold: 6,
    emoji: '🌻',
    imageUrl: '',
    badge: '100% Pure',
    isBestItem: true,
    bestItemRank: 3,
    allowCustomWeights: false,
    varieties: [
      { id: 'v-oil-1l', label: '1 Litre Pouch', price: 168, mrp: 185, inStock: true },
      { id: 'v-oil-500ml', label: '500ml Bottle', price: 86, mrp: 95, inStock: true },
      { id: 'v-oil-200ml', label: '200ml Bottle', price: 36, mrp: 40, inStock: true },
      { id: 'v-oil-5l', label: '5 Litre Jar', price: 825, mrp: 910, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 3000000,
  },
  {
    id: 'pb-item-4',
    name: 'Aashirvaad Shudh Chakki Atta (আশীর্বাদ আটা)',
    category: 'Rice & Atta',
    price: 248,
    mrp: 270,
    unit: '5 kg Pack',
    inStock: true,
    stockQuantity: 12,
    lowStockThreshold: 5,
    emoji: '🫓',
    imageUrl: '',
    badge: 'Best Seller',
    isBestItem: true,
    bestItemRank: 4,
    allowCustomWeights: false,
    varieties: [
      { id: 'v-atta-5kg', label: '5 kg Pack', price: 248, mrp: 270, inStock: true },
      { id: 'v-atta-1kg', label: '1 kg Pack', price: 52, mrp: 58, inStock: true },
      { id: 'v-atta-10kg', label: '10 kg Bag', price: 485, mrp: 530, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 4000000,
  },
  {
    id: 'pb-item-5',
    name: 'Small Grain Musur Dal (মসুর ডাল)',
    category: 'Dal & Pulses',
    price: 108,
    mrp: 120,
    unit: '1 kg',
    inStock: true,
    stockQuantity: 22,
    lowStockThreshold: 8,
    emoji: '🥣',
    imageUrl: '',
    badge: 'Fresh Stock',
    isBestItem: false,
    allowCustomWeights: true,
    updatedAt: BASE_TIMESTAMP - 5000000,
  },
  {
    id: 'pb-item-6',
    name: 'Roasted Sona Moong Dal (সোনা মুগ ডাল)',
    category: 'Dal & Pulses',
    price: 135,
    mrp: 150,
    unit: '1 kg',
    inStock: true,
    stockQuantity: 15,
    lowStockThreshold: 5,
    emoji: '🥣',
    imageUrl: '',
    badge: '',
    isBestItem: false,
    allowCustomWeights: true,
    updatedAt: BASE_TIMESTAMP - 6000000,
  },
  {
    id: 'pb-item-7',
    name: 'Jharna Pure Cow Ghee (ঝর্ণা ঘি)',
    category: 'Mustard Oil & Ghee',
    price: 175,
    mrp: 185,
    unit: '250g',
    inStock: true,
    stockQuantity: 2,
    lowStockThreshold: 5,
    emoji: '🧈',
    imageUrl: '',
    badge: 'Bengali Favourite',
    isBestItem: true,
    bestItemRank: 5,
    allowCustomWeights: false,
    varieties: [
      { id: 'v-ghee-250g', label: '250g Jar', price: 175, mrp: 185, inStock: true },
      { id: 'v-ghee-100g', label: '100g Jar', price: 74, mrp: 80, inStock: true },
      { id: 'v-ghee-500g', label: '500g Jar', price: 345, mrp: 365, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 7000000,
  },
  {
    id: 'pb-item-8',
    name: 'Sunrise Haldi & Jeera Powder Combo (হলুদ ও জিরে গুঁড়ো)',
    category: 'Spices & Masala',
    price: 68,
    mrp: 76,
    unit: 'Packet',
    inStock: true,
    stockQuantity: 20,
    lowStockThreshold: 6,
    emoji: '🌶️',
    imageUrl: '',
    badge: '',
    allowCustomWeights: false,
    varieties: [
      { id: 'v-spice-100g', label: '100g Combo Pack', price: 68, mrp: 76, inStock: true },
      { id: 'v-spice-50g', label: '50g Small Pack', price: 35, mrp: 40, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 8000000,
  },
  {
    id: 'pb-item-9',
    name: 'Bengali Panch Phoron Whole (পাঁচ ফোড়ন)',
    category: 'Spices & Masala',
    price: 25,
    mrp: 30,
    unit: '100g',
    inStock: true,
    stockQuantity: 14,
    lowStockThreshold: 5,
    emoji: '🌶️',
    imageUrl: '',
    badge: 'Fresh Aroma',
    allowCustomWeights: true,
    updatedAt: BASE_TIMESTAMP - 9000000,
  },
  {
    id: 'pb-item-10',
    name: 'Tata Tea Gold Leaf (টাটা টি গোল্ড)',
    category: 'Tea & Biscuits',
    price: 145,
    mrp: 160,
    unit: '250g',
    inStock: true,
    stockQuantity: 16,
    lowStockThreshold: 5,
    emoji: '☕',
    imageUrl: '',
    badge: '',
    allowCustomWeights: false,
    varieties: [
      { id: 'v-tea-250g', label: '250g Pack', price: 145, mrp: 160, inStock: true },
      { id: 'v-tea-100g', label: '100g Pack', price: 60, mrp: 65, inStock: true },
      { id: 'v-tea-500g', label: '500g Economy Pack', price: 280, mrp: 310, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 10000000,
  },
  {
    id: 'pb-item-11',
    name: 'Britannia Marie Gold Family Pack (মেরি বিস্কুট)',
    category: 'Tea & Biscuits',
    price: 38,
    mrp: 40,
    unit: 'Packet',
    inStock: true,
    stockQuantity: 30,
    lowStockThreshold: 8,
    emoji: '🍪',
    imageUrl: '',
    badge: '',
    updatedAt: BASE_TIMESTAMP - 11000000,
  },
  {
    id: 'pb-item-12',
    name: 'Maggi 2-Minute Masala Noodles (ম্যাগি)',
    category: 'Tea & Biscuits',
    price: 14,
    mrp: 14,
    unit: 'Packet',
    inStock: true,
    stockQuantity: 40,
    lowStockThreshold: 10,
    emoji: '🍜',
    imageUrl: '',
    badge: '',
    varieties: [
      { id: 'v-maggi-1', label: 'Single Pack (70g)', price: 14, mrp: 14, inStock: true },
      { id: 'v-maggi-4', label: '4-Pack Bundle (280g)', price: 54, mrp: 56, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 12000000,
  },
  {
    id: 'pb-item-13',
    name: 'Amul Taaza Homogenised Milk (আমুল তাজা দুধ)',
    category: 'Dairy & Eggs',
    price: 37,
    mrp: 38,
    unit: '500ml',
    inStock: true,
    stockQuantity: 4,
    lowStockThreshold: 8,
    emoji: '🥛',
    imageUrl: '',
    badge: '',
    varieties: [
      { id: 'v-milk-500ml', label: '500ml Pack', price: 37, mrp: 38, inStock: true },
      { id: 'v-milk-1l', label: '1 Litre Carton', price: 72, mrp: 75, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 13000000,
  },
  {
    id: 'pb-item-14',
    name: 'Fresh Poultry Eggs (পোল্ট্রি ডিম - ১ জোড়া)',
    category: 'Dairy & Eggs',
    price: 14,
    mrp: 16,
    unit: 'Pair (জোড়া)',
    inStock: true,
    stockQuantity: 25,
    lowStockThreshold: 10,
    emoji: '🥚',
    imageUrl: '',
    badge: 'Daily Rate',
    varieties: [
      { id: 'v-egg-pair', label: '1 Pair (২ টি)', price: 14, mrp: 16, inStock: true },
      { id: 'v-egg-6', label: '6 Pieces (৬ টি)', price: 41, mrp: 48, inStock: true },
      { id: 'v-egg-12', label: '1 Dozen (১২ টি)', price: 80, mrp: 96, inStock: true },
      { id: 'v-egg-30', label: 'Full Tray (৩০ টি)', price: 195, mrp: 230, inStock: true },
    ],
    updatedAt: BASE_TIMESTAMP - 14000000,
  },
  {
    id: 'pb-item-15',
    name: 'Refined White Sugar (চিনি)',
    category: 'Daily Essentials',
    price: 46,
    mrp: 50,
    unit: '1 kg',
    inStock: true,
    stockQuantity: 35,
    lowStockThreshold: 10,
    emoji: '🧂',
    imageUrl: '',
    badge: '',
    allowCustomWeights: true,
    updatedAt: BASE_TIMESTAMP - 15000000,
  },
  {
    id: 'pb-item-16',
    name: 'Tata Iodized Salt (টাটা লবণ)',
    category: 'Daily Essentials',
    price: 26,
    mrp: 28,
    unit: '1 kg',
    inStock: true,
    stockQuantity: 28,
    lowStockThreshold: 8,
    emoji: '🧂',
    imageUrl: '',
    badge: '',
    updatedAt: BASE_TIMESTAMP - 16000000,
  },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Parbati Bhandar (পার্বতী ভান্ডার)',
  tagline:
    'Your Trusted Local Kirana & Grocery Store in Swasti Pally, Gangpur • ন্যায্য মূল্যে সেরা মানের মুদিখানার বিশ্বস্ত প্রতিষ্ঠান',
  phone: '+91 97347 65207',
  whatsappNumber: '919734765207',
  address: 'Swasti Pally, Gangpur, Purba Bardhaman, West Bengal 713103',
  mapsUrl: 'https://maps.app.goo.gl/pK5Tk8ms2S8NsPSS7',
  timings: 'Mon–Sun: 7:00 AM – 10:00 PM',
  rating: '5.0 ★',
  autoSchedule: false,
  isOpen: true,
  announcement:
    "🙏 স্বাগতম পার্বতী ভান্ডারে! Check today's live grocery stock & prices below and send your order list directly on WhatsApp (097347 65207).",
  greetingTop: 'Nomoshkar',
  greetingMain: 'Grahok',
  greetingBengali: 'নমস্কার গ্রাহক • স্বস্তি পল্লী, বর্ধমান',
  deliveryEtaMins: '10',
  showOccasionBanner: true,
  seasonalCollectionTitle: 'Christmas Specials',
  seasonalCollectionIcon: '🎄',
  occasionTitle: 'Merry Christmas',
  occasionSubtitle: 'শুভ বড়দিন • Wishing you joy, warmth and happiness',
  occasionTag: 'Christmas Celebration',
  occasionImageUrl: '',
  storeWebsiteUrl: '',
  scannerImageUrl: '',
  scannerMode: 'link',
};

/**
 * Checks whether the store is currently open based on IST (7:00 AM - 10:00 PM) or manual toggle.
 */
export function checkIsStoreOpenIST(settings: StoreSettings, now: Date = new Date()): boolean {
  if (!settings.autoSchedule) {
    return settings.isOpen;
  }
  try {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utcMs + 5.5 * 3600000);
    const hours = istDate.getHours();
    return hours >= 7 && hours < 22;
  } catch {
    return settings.isOpen;
  }
}

/**
 * Calculates percentage discount between MRP and selling price.
 */
export function calculateDiscountPercent(price: number, mrp?: number | null): number {
  if (!mrp || Number(mrp) <= Number(price) || Number(mrp) <= 0) {
    return 0;
  }
  return Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100);
}

/**
 * Calculates full discount details (percentage and rupee savings) for automatic display.
 */
export function calculateDiscountDetails(
  price: number,
  mrp?: number | null
): {
  hasDiscount: boolean;
  discountPercent: number;
  savedAmount: number;
} {
  const numPrice = Number(price);
  const numMrp = Number(mrp || 0);
  if (!mrp || isNaN(numPrice) || isNaN(numMrp) || numMrp <= numPrice || numMrp <= 0) {
    return { hasDiscount: false, discountPercent: 0, savedAmount: 0 };
  }
  const savedAmount = Math.round((numMrp - numPrice) * 100) / 100;
  const discountPercent = Math.round(((numMrp - numPrice) / numMrp) * 100);
  return {
    hasDiscount: discountPercent > 0 || savedAmount > 0,
    discountPercent,
    savedAmount,
  };
}

/**
 * Parses a base unit string (like '1 kg', '500g', '250g', '100g', '1 Litre', '500ml') into grams or ml.
 */
export function parseBaseUnitToGramsOrMl(unit: string): {
  type: 'weight' | 'volume' | 'discrete';
  baseAmount: number;
} {
  const normalized = (unit || '').trim().toLowerCase();
  if (normalized === '1 kg' || normalized === 'kg') {
    return { type: 'weight', baseAmount: 1000 };
  }
  if (normalized === '500g' || normalized === '500 gm' || normalized === '500gm') {
    return { type: 'weight', baseAmount: 500 };
  }
  if (normalized === '250g' || normalized === '250 gm' || normalized === '250gm') {
    return { type: 'weight', baseAmount: 250 };
  }
  if (normalized === '200g' || normalized === '200 gm' || normalized === '200gm') {
    return { type: 'weight', baseAmount: 200 };
  }
  if (normalized === '100g' || normalized === '100 gm' || normalized === '100gm') {
    return { type: 'weight', baseAmount: 100 };
  }
  if (normalized === '2 kg') {
    return { type: 'weight', baseAmount: 2000 };
  }
  if (normalized === '1 litre' || normalized === '1 l') {
    return { type: 'volume', baseAmount: 1000 };
  }
  if (normalized === '500ml' || normalized === '500 ml') {
    return { type: 'volume', baseAmount: 500 };
  }
  if (normalized === '250ml' || normalized === '250 ml') {
    return { type: 'volume', baseAmount: 250 };
  }
  return { type: 'discrete', baseAmount: 1 };
}

export interface WeightOptionChoice {
  label: string;
  gramsOrMl: number;
  price: number;
  mrp: number | null;
}

/**
 * Returns selectable weight/volume options (100g, 200g, 250g, 500g, 1 kg, 2 kg, 5 kg)
 * for loose/weighable products when no explicit fixed varieties are defined (or when allowCustomWeights is enabled).
 */
export function getWeightOptionsForProduct(product: Product): WeightOptionChoice[] {
  const parsed = parseBaseUnitToGramsOrMl(product.unit);
  const canScaleByWeight =
    product.allowCustomWeights !== undefined
      ? product.allowCustomWeights
      : parsed.type !== 'discrete' && (!product.varieties || product.varieties.length === 0);

  if (!canScaleByWeight || parsed.type === 'discrete') {
    return [];
  }

  const presets =
    parsed.type === 'weight'
      ? [
          { label: '100g', amount: 100 },
          { label: '200g', amount: 200 },
          { label: '250g', amount: 250 },
          { label: '500g', amount: 500 },
          { label: '1 kg', amount: 1000 },
          { label: '2 kg', amount: 2000 },
          { label: '5 kg', amount: 5000 },
        ]
      : [
          { label: '200ml', amount: 200 },
          { label: '250ml', amount: 250 },
          { label: '500ml', amount: 500 },
          { label: '1 Litre', amount: 1000 },
          { label: '2 Litre', amount: 2000 },
        ];

  return presets.map((p) => {
    const ratio = p.amount / parsed.baseAmount;
    const scaledPrice = Math.max(1, Math.round(Number(product.price) * ratio));
    const scaledMrp =
      product.mrp && Number(product.mrp) > 0
        ? Math.max(scaledPrice, Math.round(Number(product.mrp) * ratio))
        : null;
    return {
      label: p.label,
      gramsOrMl: p.amount,
      price: scaledPrice,
      mrp: scaledMrp,
    };
  });
}

/**
 * Calculates price and MRP for any custom customer weight input (e.g., 300g, 750g, 1.5kg, etc.).
 */
export function calculateCustomWeightOption(
  product: Product,
  amountValue: number,
  unitType: 'g' | 'kg' | 'ml' | 'L'
): WeightOptionChoice | null {
  if (!amountValue || isNaN(amountValue) || amountValue <= 0) return null;
  const parsed = parseBaseUnitToGramsOrMl(product.unit);
  const baseGrams = parsed.type === 'discrete' ? 1000 : parsed.baseAmount;

  const targetGramsOrMl =
    unitType === 'kg' || unitType === 'L' ? amountValue * 1000 : amountValue;

  const ratio = targetGramsOrMl / baseGrams;
  const price = Math.max(1, Math.round(Number(product.price) * ratio));
  const mrp =
    product.mrp && Number(product.mrp) > 0
      ? Math.max(price, Math.round(Number(product.mrp) * ratio))
      : null;

  const cleanLabel =
    unitType === 'g' && amountValue >= 1000 && amountValue % 1000 === 0
      ? `${amountValue / 1000} kg`
      : unitType === 'kg'
      ? `${amountValue} kg`
      : unitType === 'L'
      ? `${amountValue} Litre`
      : `${amountValue}${unitType}`;

  return {
    label: cleanLabel,
    gramsOrMl: targetGramsOrMl,
    price,
    mrp,
  };
}

/**
 * Filters and sorts products for the Customer Storefront view.
 */
export function filterAndSortCustomerProducts(
  products: Product[],
  options: {
    searchQuery: string;
    selectedCategory: string;
    inStockOnly: boolean;
    sortBy: string;
  }
): Product[] {
  const { searchQuery, selectedCategory, inStockOnly, sortBy } = options;
  const q = searchQuery.trim().toLowerCase();

  return products
    .filter((item) => {
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.badge?.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStock = !inStockOnly || item.inStock;
      return matchesSearch && matchesCat && matchesStock;
    })
    .sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
}

/**
 * Determines whether a product's current stock quantity has dropped below its configured Low Stock Threshold.
 */
export function isProductLowStock(
  product: Pick<Product, 'stockQuantity' | 'lowStockThreshold'>
): boolean {
  if (
    product.stockQuantity === undefined ||
    product.stockQuantity === null ||
    product.lowStockThreshold === undefined ||
    product.lowStockThreshold === null
  ) {
    return false;
  }
  const qty = Number(product.stockQuantity);
  const threshold = Number(product.lowStockThreshold);
  if (isNaN(qty) || isNaN(threshold) || threshold <= 0) {
    return false;
  }
  return qty < threshold;
}

/**
 * Returns up to 5 products marked as Best Items (isBestItem) sorted by their Best 5 Slider rank (1 = first -> 5 = last).
 */
export function getBestItems(products: Product[], maxSlides = 5): Product[] {
  const marked = products.filter(
    (p) =>
      p.inStock &&
      (p.isBestItem ||
        (typeof p.bestItemRank === 'number' && p.bestItemRank >= 1 && p.bestItemRank <= maxSlides))
  );
  if (marked.length > 0) {
    const sorted = [...marked].sort((a, b) => {
      const rankA =
        typeof a.bestItemRank === 'number' && a.bestItemRank >= 1 && a.bestItemRank <= maxSlides
          ? a.bestItemRank
          : 999;
      const rankB =
        typeof b.bestItemRank === 'number' && b.bestItemRank >= 1 && b.bestItemRank <= maxSlides
          ? b.bestItemRank
          : 999;
      if (rankA !== rankB) return rankA - rankB;
      return b.updatedAt - a.updatedAt;
    });
    return sorted.slice(0, maxSlides);
  }
  return products.filter((p) => p.inStock).slice(0, maxSlides);
}

/**
 * Assigns a product to a specific Slider Slot (1..5) or removes it from the Best 5 Slider (null),
 * automatically swapping or shifting any existing product at that slot so ranks 1..5 remain unique.
 */
export function assignBestItemRank(
  products: Product[],
  targetProductId: string,
  newRank: number | null,
  now = Date.now()
): Product[] {
  const target = products.find((p) => p.id === targetProductId);
  if (!target) return products;

  if (newRank === null || newRank < 1 || newRank > 5) {
    return products.map((p) =>
      p.id === targetProductId
        ? { ...p, isBestItem: false, bestItemRank: null, updatedAt: now }
        : p
    );
  }

  const normalizedRank = Math.min(5, Math.max(1, Math.round(newRank)));
  const oldRank =
    typeof target.bestItemRank === 'number' &&
    target.bestItemRank >= 1 &&
    target.bestItemRank <= 5
      ? target.bestItemRank
      : null;

  // Check if another product currently holds normalizedRank
  const occupant = products.find(
    (p) => p.id !== targetProductId && p.isBestItem && p.bestItemRank === normalizedRank
  );

  // Find first unused slot in 1..5 if we need to shift an occupant without an oldRank
  const usedRanks = new Set(
    products
      .filter((p) => p.id !== targetProductId && p.isBestItem && typeof p.bestItemRank === 'number')
      .map((p) => p.bestItemRank as number)
  );
  usedRanks.add(normalizedRank);
  let fallbackFreeRank: number | null = null;
  for (let r = 1; r <= 5; r++) {
    if (!usedRanks.has(r)) {
      fallbackFreeRank = r;
      break;
    }
  }

  return products.map((p) => {
    if (p.id === targetProductId) {
      return {
        ...p,
        isBestItem: true,
        bestItemRank: normalizedRank,
        updatedAt: now,
      };
    }
    if (occupant && p.id === occupant.id) {
      const replacementRank = oldRank !== null ? oldRank : fallbackFreeRank;
      return {
        ...p,
        isBestItem: replacementRank !== null,
        bestItemRank: replacementRank,
        updatedAt: now,
      };
    }
    return p;
  });
}

export interface AutomaticFestivalTheme { id: string; title: string; subtitle: string; tag: string; emoji: string; }
export function getAutomaticFestivalTheme(date = new Date()): AutomaticFestivalTheme | null {
  const month = date.getMonth() + 1, day = date.getDate();
  const inRange = (m: number, a: number, b: number) => month === m && day >= a && day <= b;
  if (inRange(1,13,15)) return { id:'makar-sankranti', title:'শুভ মকর সংক্রান্তি', subtitle:'নতুন ফসল, পিঠে-পুলি আর আনন্দের উৎসব', tag:'Makar Sankranti • Poush Parbon', emoji:'🌾' };
  if (inRange(1,24,26)) return { id:'republic-day', title:'Happy Republic Day', subtitle:'Celebrating the spirit of India', tag:'Republic Day', emoji:'🇮🇳' };
  if (inRange(4,14,15)) return { id:'poila-boishakh', title:'শুভ নববর্ষ', subtitle:'নতুন বছর শুরু হোক আনন্দ আর সমৃদ্ধিতে', tag:'Poila Boishakh • Bengali New Year', emoji:'🌼' };
  if (inRange(8,13,15)) return { id:'independence-day', title:'Happy Independence Day', subtitle:'স্বাধীনতার আনন্দে সবাইকে শুভেচ্ছা', tag:'Independence Day', emoji:'🇮🇳' };
  if (inRange(10,1,2)) return { id:'gandhi-jayanti', title:'Gandhi Jayanti', subtitle:'Remembering peace and kindness', tag:'Gandhi Jayanti', emoji:'🕊️' };
  if (inRange(11,13,16) && date.getFullYear() === 2026) return { id:'chhath-puja', title:'শুভ ছট পূজা', subtitle:'সূর্য অর্ঘ্য • উৎসবের আনন্দে Parbati Bhandar', tag:'Chhath Puja Celebration', emoji:'🪔' };
  if (inRange(12,20,26)) return { id:'christmas', title:'Merry Christmas', subtitle:'শুভ বড়দিন • Wishing you joy and happiness', tag:'Christmas Celebration', emoji:'🎄' };
  if ((month === 12 && day >= 27) || (month === 1 && day <= 2)) return { id:'new-year', title:'শুভ নববর্ষ • Happy New Year', subtitle:'Fresh essentials and fresh hopes', tag:'New Year Celebration', emoji:'🎉' };
  return null;
}
export type HeroSlide =
  | {
      type: 'festive';
      id: 'festive-banner';
      title: string;
      subtitle: string;
      tag: string;
      imageUrl: string;
    }
  | {
      type: 'product';
      id: string;
      rank: number;
      product: Product;
    };

/**
 * Builds the ordered list of slides for the merged Hero Slider Bar:
 * - If showOccasionBanner is enabled (not false), Slide 1 is the Festive Season banner,
 *   followed by the Best 5 products in their configured rank order (1st to 5th).
 * - If showOccasionBanner is disabled (false), ONLY the Best 5 products are included in the slider.
 */
export function buildHeroSlides(
  products: Product[],
  settings: Pick<
    StoreSettings,
    'showOccasionBanner' | 'occasionTitle' | 'occasionSubtitle' | 'occasionTag' | 'occasionImageUrl'
  >
): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const occasionImage = settings.occasionImageUrl || '';
  // Chhath 2026 runs 13–16 November. Force the campaign during these dates,
  // even when older cloud settings contain a different occasion or hide the banner.
  const localDate = new Date();
  const isChhathCalendarWindow = localDate.getFullYear() === 2026 && localDate.getMonth() === 10 && localDate.getDate() >= 13 && localDate.getDate() <= 16;
  const isChhathOccasion = isChhathCalendarWindow || /chhath|ছট\\s*(পূজা|পুজো)?/i.test(`${settings.occasionTitle || ''} ${settings.occasionSubtitle || ''} ${settings.occasionTag || ''} ${occasionImage}`);
  const hasCustomOccasion = Boolean(settings.occasionTitle?.trim() || occasionImage.trim());
  // Chhath is a dedicated seasonal campaign: keep its hero visible even if an
  // older saved setting has the generic occasion-banner switch turned off.
  // Other owner-selected occasions continue to respect the normal switch.
  const shouldShowOccasion = isChhathOccasion || settings.showOccasionBanner === true || !hasCustomOccasion;
  if (shouldShowOccasion) {
    slides.push({
      type: 'festive',
      id: 'festive-banner',
      title: isChhathOccasion ? (settings.occasionTitle?.trim() && /chhath|ছট/i.test(settings.occasionTitle) ? settings.occasionTitle.trim() : 'শুভ ছট পূজা') : (settings.occasionTitle?.trim() || 'Merry Christmas'),
      subtitle: isChhathOccasion ? (settings.occasionSubtitle?.trim() && /chhath|ছট/i.test(settings.occasionSubtitle) ? settings.occasionSubtitle.trim() : 'সূর্য অর্ঘ্য • উৎসবের আনন্দে Parbati Bhandar') : (settings.occasionSubtitle?.trim() || 'শুভ বড়দিন • Wishing you joy, warmth and happiness'),
      tag: isChhathOccasion ? 'Chhath Puja Celebration' : (settings.occasionTag?.trim() || 'Christmas Celebration'),
      imageUrl: occasionImage,
    });
  }
  const orderedBest = getBestItems(products, 5);
  orderedBest.forEach((product, idx) => {
    slides.push({
      type: 'product',
      id: `best-slide-${product.id}`,
      rank:
        typeof product.bestItemRank === 'number' &&
        product.bestItemRank >= 1 &&
        product.bestItemRank <= 5
          ? product.bestItemRank
          : idx + 1,
      product,
    });
  });

  return slides;
}

/**
 * Checks whether a customer search bar query matches the Owner's secret unlock command
 * so the owner can open the Admin portal without any visible login button on the customer page.
 */
export function calculateMilestoneProgress(cartTotalPrice: number): {
  tier50Unlocked: boolean;
  tier100Unlocked: boolean;
  tier200Unlocked: boolean;
  nextTargetAmount: number;
  amountNeeded: number;
  nextRewardLabel: string;
} {
  const total = Math.max(0, Number(cartTotalPrice) || 0);
  const tier50Unlocked = total >= 399;
  const tier100Unlocked = total >= 749;
  const tier200Unlocked = total >= 1199;

  if (!tier50Unlocked) {
    return {
      tier50Unlocked,
      tier100Unlocked,
      tier200Unlocked,
      nextTargetAmount: 399,
      amountNeeded: Math.max(1, Math.ceil(399 - total)),
      nextRewardLabel: '₹50 Assured Savings',
    };
  }
  if (!tier100Unlocked) {
    return {
      tier50Unlocked,
      tier100Unlocked,
      tier200Unlocked,
      nextTargetAmount: 749,
      amountNeeded: Math.max(1, Math.ceil(749 - total)),
      nextRewardLabel: '₹100 Cashback Offer',
    };
  }
  if (!tier200Unlocked) {
    return {
      tier50Unlocked,
      tier100Unlocked,
      tier200Unlocked,
      nextTargetAmount: 1199,
      amountNeeded: Math.max(1, Math.ceil(1199 - total)),
      nextRewardLabel: '₹200 Mega Savings',
    };
  }
  return {
    tier50Unlocked: true,
    tier100Unlocked: true,
    tier200Unlocked: true,
    nextTargetAmount: 1199,
    amountNeeded: 0,
    nextRewardLabel: '₹200 Mega Savings Unlocked!',
  };
}

/**
 * Filters and sorts products for the Owner Admin view.
 */
export function filterAdminProducts(
  products: Product[],
  options: {
    adminSearch: string;
    adminCategoryFilter: string;
    lowStockOnly?: boolean;
  }
): Product[] {
  const { adminSearch, adminCategoryFilter, lowStockOnly = false } = options;
  const q = adminSearch.trim().toLowerCase();

  return products
    .filter((item) => {
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.badge?.toLowerCase().includes(q);
      const matchesCat = adminCategoryFilter === 'all' || item.category === adminCategoryFilter;
      const matchesLowStock = !lowStockOnly || isProductLowStock(item);
      return matchesSearch && matchesCat && matchesLowStock;
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function makeCartKey(productId: string, selectedUnit: string): string {
  return `${productId}__${selectedUnit}`;
}

/**
 * Updates cart item quantity immutably for a specific product + selected unit/variety option.
 */
export function updateCartQuantity(
  cart: CartMap,
  product: Product,
  delta: number,
  option?: { selectedUnit?: string; unitPrice?: number; unitMrp?: number | null }
): CartMap {
  const selectedUnit = option?.selectedUnit || product.unit || '1 unit';
  const unitPrice = option?.unitPrice !== undefined ? option.unitPrice : Number(product.price);
  const unitMrp = option?.unitMrp !== undefined ? option.unitMrp : product.mrp;
  const key = makeCartKey(product.id, selectedUnit);

  // Also check legacy key if present
  const existingItem = cart[key] || (selectedUnit === product.unit ? cart[product.id] : undefined);
  const actualKey = cart[key] ? key : existingItem ? product.id : key;

  const current = existingItem?.qty || 0;
  const next = current + delta;
  // Enforce the product's total stock across every selected variety/unit.
  // This is a client-side guard; the order API must still validate stock server-side.
  if (delta > 0) {
    if (!product.inStock) return cart;
    if (Number.isFinite(Number(product.stockQuantity))) {
      const totalInCart = Object.values(cart).reduce(
        (total, item) => total + (item.product.id === product.id ? Number(item.qty || 0) : 0),
        0
      );
      if (totalInCart + delta > Number(product.stockQuantity)) return cart;
    }
  }
  if (next <= 0) {
    const copy = { ...cart };
    delete copy[actualKey];
    return copy;
  }
  return {
    ...cart,
    [actualKey]: {
      cartKey: actualKey,
      product,
      selectedUnit,
      unitPrice,
      unitMrp,
      qty: next,
    },
  };
}

/**
 * Calculates total item count, total price, and total savings from a CartMap.
 */
export function calculateCartTotals(cart: CartMap): {
  cartItemsList: CartItem[];
  cartTotalItems: number;
  cartTotalPrice: number;
  cartTotalSaved: number;
} {
  const cartItemsList = Object.values(cart).map((item) => ({
    ...item,
    cartKey: item.cartKey || makeCartKey(item.product.id, item.selectedUnit || item.product.unit),
    selectedUnit: item.selectedUnit || item.product.unit,
    unitPrice: item.unitPrice !== undefined ? item.unitPrice : Number(item.product.price || 0),
    unitMrp: item.unitMrp !== undefined ? item.unitMrp : item.product.mrp,
  }));
  const cartTotalItems = cartItemsList.reduce((acc, item) => acc + item.qty, 0);
  const cartTotalPrice = cartItemsList.reduce(
    (acc, item) => acc + Number(item.unitPrice || 0) * item.qty,
    0
  );
  const cartTotalSaved = cartItemsList.reduce((acc, item) => {
    const mrp = Number(item.unitMrp || 0);
    const price = Number(item.unitPrice || 0);
    if (mrp > price) {
      return acc + (mrp - price) * item.qty;
    }
    return acc;
  }, 0);
  return { cartItemsList, cartTotalItems, cartTotalPrice, cartTotalSaved };
}

/**
 * Generates a clean text-format WhatsApp order bill containing the Customer Name
 * and each item's Name and Quantity (pack/weight + count) only.
 */
export function generateWhatsAppOrderText(params: {
  storeName: string;
  customerName: string;
  customerNote: string;
  cartItemsList: CartItem[];
  cartTotalPrice?: number;
  cartTotalSaved?: number;
}): string {
  const {
    storeName,
    customerName,
    customerNote,
    cartItemsList,
  } = params;
  const cleanCustomerName = customerName.trim() || 'Customer (গ্রাহক)';
  const lines = [
    `🧾 *ORDER BILL — ${storeName}*`,
    `👤 *Customer Name:* ${cleanCustomerName}`,
    `----------------------------------`,
    `*ITEMS (NAME & QUANTITY):*`,
    ...cartItemsList.map((item, idx) => {
      const unitLabel = item.selectedUnit || item.product.unit;
      const qtyDisplay = item.qty > 1 ? `${unitLabel} × ${item.qty}` : `${unitLabel} × 1`;
      return `${idx + 1}. *${item.product.name}* — Qty: ${qtyDisplay}`;
    }),
    `----------------------------------`,
    customerNote.trim() ? `📝 *Note:* ${customerNote.trim()}` : null,
    `Please confirm my order. Thank you! 🙏`,
  ].filter(Boolean);
  return lines.join('\n');
}

/**
 * Builds a clean wa.me link with normalized Indian phone code.
 */
export function buildWhatsAppUrl(rawPhone: string, orderText: string): string {
  let cleanPhone = (rawPhone || '919734765207').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderText)}`;
}

/**
 * Compresses an uploaded image File to a lightweight JPEG data URL.
 */
export function compressImageToBase64(
  file: File,
  maxWidth = 360,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Generates a deterministic 21x21 QR-like matrix for a given string.
 */
export function generateQrMatrix(data: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const isTiming = r === 6 || c === 6;
      if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = Math.abs(hash) % 10 < 5;
    }
  }

  return grid;
}
