import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SAMPLE_PRODUCTS,
  DEFAULT_STORE_SETTINGS,
  calculateDiscountPercent,
  calculateDiscountDetails,
  getWeightOptionsForProduct,
  calculateCustomWeightOption,
  filterAndSortCustomerProducts,
  filterAdminProducts,
  isProductLowStock,
  updateCartQuantity,
  calculateCartTotals,
  generateWhatsAppOrderText,
  buildWhatsAppUrl,
  checkIsStoreOpenIST,
  generateQrMatrix,
  getBestItems,
  assignBestItemRank,
  buildHeroSlides,
  getAutomaticFestivalTheme,
  calculateMilestoneProgress,
} from './storeLogic';

test('getBestItems, assignBestItemRank, and buildHeroSlides order Best 5 slides and merge with Festive banner', () => {
  const best = getBestItems(INITIAL_SAMPLE_PRODUCTS);
  assert.equal(best.length, 5);
  assert.deepEqual(
    best.map((p) => p.bestItemRank),
    [1, 2, 3, 4, 5]
  );
  assert.equal(best[0].id, 'pb-item-1'); // Rank #1 shows first
  assert.equal(best[4].id, 'pb-item-7'); // Rank #5 shows last

  // Swap Rank #1 and Rank #5 using assignBestItemRank
  const swapped = assignBestItemRank(INITIAL_SAMPLE_PRODUCTS, 'pb-item-7', 1);
  const reorderedBest = getBestItems(swapped);
  assert.equal(reorderedBest[0].id, 'pb-item-7'); // Now Jharna Ghee is #1 (First)
  assert.equal(reorderedBest[4].id, 'pb-item-1'); // Now Miniket Rice is #5 (Last)

  // Hero slides when Festive Season banner is ON (1 festive + 5 best products = 6 slides)
  const slidesWithFestive = buildHeroSlides(swapped, {
    ...DEFAULT_STORE_SETTINGS,
    showOccasionBanner: true,
  });
  assert.equal(slidesWithFestive.length, 6);
  assert.equal(slidesWithFestive[0].type, 'festive');
  assert.equal(slidesWithFestive[1].type, 'product');
  if (slidesWithFestive[1].type === 'product') {
    assert.equal(slidesWithFestive[1].product.id, 'pb-item-7');
    assert.equal(slidesWithFestive[1].rank, 1);
  }

  // Hero slides when Festive Season banner is OFF (only 5 best products slide)
  const slidesWithoutFestive = buildHeroSlides(swapped, {
    ...DEFAULT_STORE_SETTINGS,
    showOccasionBanner: false,
  }, new Date('2026-03-01T12:00:00'));
  assert.equal(slidesWithoutFestive.length, 5);
  assert.ok(slidesWithoutFestive.every((s) => s.type === 'product'));

  const m1 = calculateMilestoneProgress(200);
  assert.equal(m1.tier50Unlocked, false);
  assert.equal(m1.amountNeeded, 199);

  const m2 = calculateMilestoneProgress(484);
  assert.equal(m2.tier50Unlocked, true);
  assert.equal(m2.tier100Unlocked, false);
  assert.equal(m2.amountNeeded, 265);
});

test('INITIAL_SAMPLE_PRODUCTS contains 16 regional Parbati Bhandar items with varieties', () => {
  assert.equal(INITIAL_SAMPLE_PRODUCTS.length, 16);
  assert.equal(INITIAL_SAMPLE_PRODUCTS[0].name, 'Burdwan Special Miniket Rice (মিনিকেট চাল)');
  assert.equal(INITIAL_SAMPLE_PRODUCTS[0].price, 56);

  const atta = INITIAL_SAMPLE_PRODUCTS.find((p) => p.id === 'pb-item-4');
  assert.ok(atta?.varieties && atta.varieties.length >= 2);
  assert.equal(atta.varieties[0].label, '5 kg Pack');
  assert.equal(atta.varieties[1].label, '1 kg Pack');
});

test('isProductLowStock detects when stockQuantity drops below lowStockThreshold', () => {
  assert.equal(isProductLowStock({ stockQuantity: 3, lowStockThreshold: 5 }), true);
  assert.equal(isProductLowStock({ stockQuantity: 0, lowStockThreshold: 5 }), true);
  assert.equal(isProductLowStock({ stockQuantity: 5, lowStockThreshold: 5 }), false);
  assert.equal(isProductLowStock({ stockQuantity: 12, lowStockThreshold: 5 }), false);
  assert.equal(isProductLowStock({ stockQuantity: undefined, lowStockThreshold: 5 }), false);

  const lowStockItems = filterAdminProducts(INITIAL_SAMPLE_PRODUCTS, {
    adminSearch: '',
    adminCategoryFilter: 'all',
    lowStockOnly: true,
  });
  assert.equal(lowStockItems.length, 3);
});

test('calculateDiscountPercent and calculateDiscountDetails compute percentage and rupee savings automatically', () => {
  assert.equal(calculateDiscountPercent(56, 62), 10);
  const details = calculateDiscountDetails(248, 270);
  assert.equal(details.hasDiscount, true);
  assert.equal(details.savedAmount, 22);
  assert.equal(details.discountPercent, 8);

  const noDiscount = calculateDiscountDetails(14, 14);
  assert.equal(noDiscount.hasDiscount, false);
  assert.equal(noDiscount.savedAmount, 0);
});

test('getWeightOptionsForProduct and calculateCustomWeightOption scale prices for 200g, 500g, 2kg, and custom weights', () => {
  const miniket = INITIAL_SAMPLE_PRODUCTS[0]; // ₹56 per 1 kg (MRP ₹62)
  const options = getWeightOptionsForProduct(miniket);
  assert.ok(options.length >= 6);

  const opt500g = options.find((o) => o.label === '500g');
  assert.equal(opt500g?.price, 28);
  assert.equal(opt500g?.mrp, 31);

  const opt2kg = options.find((o) => o.label === '2 kg');
  assert.equal(opt2kg?.price, 112);
  assert.equal(opt2kg?.mrp, 124);

  const opt200g = options.find((o) => o.label === '200g');
  assert.equal(opt200g?.price, 11);

  const custom300g = calculateCustomWeightOption(miniket, 300, 'g');
  assert.equal(custom300g?.label, '300g');
  assert.equal(custom300g?.price, 17);
});

test('filterAndSortCustomerProducts filters by search query, category, stock, and sorts by price', () => {
  const miniketResults = filterAndSortCustomerProducts(INITIAL_SAMPLE_PRODUCTS, {
    searchQuery: 'miniket',
    selectedCategory: 'all',
    inStockOnly: false,
    sortBy: 'recent',
  });
  assert.equal(miniketResults.length, 1);
  assert.equal(miniketResults[0].id, 'pb-item-1');

  const oilResults = filterAndSortCustomerProducts(INITIAL_SAMPLE_PRODUCTS, {
    searchQuery: '',
    selectedCategory: 'Mustard Oil & Ghee',
    inStockOnly: true,
    sortBy: 'price-asc',
  });
  assert.equal(oilResults.length, 2);
  assert.equal(oilResults[0].price, 168);
  assert.equal(oilResults[1].price, 175);
});

test('filterAdminProducts filters by name, category, or custom badge', () => {
  const results = filterAdminProducts(INITIAL_SAMPLE_PRODUCTS, {
    adminSearch: 'Burdwan Special',
    adminCategoryFilter: 'Rice & Atta',
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].price, 56);
});

test('updateCartQuantity supports multiple weight/variety selections of the same product', () => {
  const atta = INITIAL_SAMPLE_PRODUCTS[3]; // Aashirvaad Atta

  let cart = updateCartQuantity({}, atta, 1, {
    selectedUnit: '5 kg Pack',
    unitPrice: 248,
    unitMrp: 270,
  });
  cart = updateCartQuantity(cart, atta, 2, {
    selectedUnit: '1 kg Pack',
    unitPrice: 52,
    unitMrp: 58,
  });

  const totals = calculateCartTotals(cart);
  assert.equal(totals.cartItemsList.length, 2);
  assert.equal(totals.cartTotalItems, 3);
  assert.equal(totals.cartTotalPrice, 248 + 52 * 2);
  assert.equal(totals.cartTotalSaved, 22 + 6 * 2);
});

test('generateWhatsAppOrderText and buildWhatsAppUrl format customer inquiry properly', () => {
  const p1 = INITIAL_SAMPLE_PRODUCTS[0];
  const cart = updateCartQuantity({}, p1, 1, {
    selectedUnit: '500g',
    unitPrice: 28,
    unitMrp: 31,
  });
  const { cartItemsList, cartTotalPrice, cartTotalSaved } = calculateCartTotals(cart);

  const text = generateWhatsAppOrderText({
    storeName: DEFAULT_STORE_SETTINGS.storeName,
    customerName: 'Subhajit Roy',
    customerNote: 'Home delivery in Swasti Pally',
    cartItemsList,
    cartTotalPrice,
    cartTotalSaved,
  });

  assert.ok(text.includes('Parbati Bhandar (পার্বতী ভান্ডার)'));
  assert.ok(text.includes('Customer Name:* Subhajit Roy'));
  assert.ok(text.includes('Qty: 500g × 1'));
  assert.equal(text.includes('₹28'), false);

  const url = buildWhatsAppUrl('9734765207', text);
  assert.ok(url.startsWith('https://wa.me/919734765207?text='));
});

test('checkIsStoreOpenIST respects manual and automatic IST schedules', () => {
  const manualClosed = { ...DEFAULT_STORE_SETTINGS, autoSchedule: false, isOpen: false };
  assert.equal(checkIsStoreOpenIST(manualClosed), false);

  const autoSettings = { ...DEFAULT_STORE_SETTINGS, autoSchedule: true };
  const openUtc = new Date('2026-11-11T04:30:00Z');
  assert.equal(checkIsStoreOpenIST(autoSettings, openUtc), true);

  const closedUtc = new Date('2026-11-11T18:00:00Z');
  assert.equal(checkIsStoreOpenIST(autoSettings, closedUtc), false);
});

test('generateQrMatrix produces a 21x21 boolean grid with finder patterns', () => {
  const matrix = generateQrMatrix('https://parbatibhandar.store');
  assert.equal(matrix.length, 21);
  assert.equal(matrix[0].length, 21);
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[3][3], true);
});


test('automatic festival calendar selects Bengali and Indian festival themes by local date', () => {
  assert.equal(getAutomaticFestivalTheme(new Date('2027-04-14T12:00:00'))?.id, 'poila-boishakh');
  assert.equal(getAutomaticFestivalTheme(new Date('2027-08-15T12:00:00'))?.id, 'independence-day');
  assert.equal(getAutomaticFestivalTheme(new Date('2027-06-10T12:00:00')), null);
});
