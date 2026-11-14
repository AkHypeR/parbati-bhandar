import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  ShoppingBag,
  ArrowLeft,
  X,
  Minus,
  Plus,
  MessageCircle,
} from 'lucide-react';
import { CartItem, Product } from '../utils/storeLogic';

type LowStockNoticeProps = { productId: string; startedAt: number | null };

function LowStockNotice({ productId, startedAt }: LowStockNoticeProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, productId]);

  const remaining = startedAt === null ? 5 * 60 * 1000 : Math.max(0, 5 * 60 * 1000 - (now - startedAt));
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const countdown = startedAt === null ? '05:00' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="mt-1 flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
        ⚠️ Order soon — low stock!
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-700">
        ⏳ Cart timer: {countdown}
      </span>
    </div>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  customerAuthenticated: boolean;
  onRequireLogin: () => void;
  liveIsOpen: boolean;
  onClose: () => void;
  cartItemsList: CartItem[];
  products: Product[];
  cartTotalItems: number;
  cartTotalPrice: number;
  cartTotalSaved: number;
  onSaveOrder: () => Promise<number | null>;
  onOrderPlaced: (orderNumber: number) => void;
  customerNote: string;
  setCustomerNote: (v: string) => void;
  updateCartQty: (
    product: Product,
    delta: number,
    option?: { selectedUnit?: string; unitPrice?: number; unitMrp?: number | null }
  ) => void;
  clearCart: () => void;
  whatsAppUrl: string;
  orderText: string;
}

export function CartDrawer({
  isOpen,
  customerAuthenticated,
  onRequireLogin,
  liveIsOpen,
  onClose,
  cartItemsList,
  products,
  cartTotalItems,
  cartTotalPrice,
  onSaveOrder,
  onOrderPlaced,
  customerNote,
  setCustomerNote,
  updateCartQty,
  clearCart,
  whatsAppUrl,
  orderText,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'checkout'>('review');
  const [savingOrder, setSavingOrder] = useState(false);
  // Keep countdown updates isolated from the whole cart to avoid mobile UI re-renders.
  const getLowStockStart = (product: Product): number | null => {
    const currentProduct = products.find(item => item.id === product.id) || product;
    let startedAt: unknown;
    try {
      const saved = JSON.parse(localStorage.getItem('parbati_bhandar_low_stock_cart_timers_v1') || '{}');
      startedAt = saved?.[currentProduct.id];
    } catch { startedAt = undefined; }
    return typeof startedAt === 'number' && Number.isFinite(startedAt) ? startedAt : null;
  };

  const isLowStockItem = (product: Product): boolean => {
    const currentProduct = products.find(item => item.id === product.id) || product;
    const stock = Number(currentProduct.stockQuantity);
    const configuredThreshold = Number(currentProduct.lowStockThreshold);
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0 ? configuredThreshold : 5;
    return currentProduct.inStock && (
      currentProduct.lowStock === true ||
      product.lowStock === true ||
      (Number.isFinite(stock) && stock > 0 && stock <= threshold) ||
      getLowStockStart(product) !== null
    );
  };

  const lowStockItems = useMemo(
    () => cartItemsList.filter(item => isLowStockItem(item.product)),
    [cartItemsList, products]
  );

  const recommendationProducts = useMemo(() => {
    const cartProductIds = new Set(cartItemsList.map(item => item.product.id));
    // Normalize category labels so equivalent labels (e.g. Masala and Spices)
    // can share recommendations.
    const normalizeCategory = (value: string | undefined) => {
      const category = (value || '').trim().toLowerCase();
      if (/masala|spice|মশলা/.test(category)) return 'spices-masala';
      if (/rice|atta|flour|চাল|আটা/.test(category)) return 'rice-atta';
      if (/dal|pulse|lentil|ছোলা|ডাল/.test(category)) return 'dal-pulses';
      if (/mustard oil|cooking oil|oil|ghee|তেল|ঘি/.test(category)) return 'oil-ghee';
      if (/tea|biscuit|চা|বিস্কুট/.test(category)) return 'tea-biscuits';
      if (/dairy|milk|egg|দুধ|ডিম/.test(category)) return 'dairy-eggs';
      if (/daily essential|salt|sugar|নিত্যপ্রয়োজনীয়|লবণ|চিনি/.test(category)) return 'daily-essentials';
      if (/breakfast|cereal|oats|সকালের/.test(category)) return 'breakfast-cereals';
      if (/snack|packaged food|noodle|স্ন্যাকস|প্যাকেটজাত/.test(category)) return 'snacks-packaged';
      if (/personal care|শিশু/.test(category)) return 'personal-care';
      if (/cleaning|household|detergent|soap|পরিষ্কার/.test(category)) return 'cleaning-household';
      return category.replace(/[^a-z0-9\u0980-\u09ff]+/g, '');
    };
    const inStock = products.filter(product =>
      product.inStock &&
      !cartProductIds.has(product.id) &&
      (product.stockQuantity == null || Number(product.stockQuantity) > 0)
    );
    const cartCategories = new Set(cartItemsList.map(item => normalizeCategory(item.product.category)).filter(Boolean));
    const sameCategory = inStock.filter(product => cartCategories.has(normalizeCategory(product.category)));

    // Show the most relevant matching-category products in a stable order.
    if (sameCategory.length > 0) {
      return [...sameCategory].sort((left, right) =>
        Number(left.bestItemRank ?? 999) - Number(right.bestItemRank ?? 999)
      ).slice(0, 5);
    }

    // Otherwise fall back to the store's five highest-ranked in-stock best items.
    const ranked = [...inStock].sort((left, right) => {
      if (Boolean(left.isBestItem) !== Boolean(right.isBestItem)) return left.isBestItem ? -1 : 1;
      return Number(left.bestItemRank ?? 999) - Number(right.bestItemRank ?? 999);
    });
    return ranked.slice(0, 5);
  }, [products, cartItemsList]);

  if (!isOpen) return null;

  const getRemainingStock = (product: Product) => {
    if (product.stockQuantity === undefined || product.stockQuantity === null || !Number.isFinite(Number(product.stockQuantity))) return Number.POSITIVE_INFINITY;
    const inCart = cartItemsList.reduce((total, item) => total + (item.product.id === product.id ? item.qty : 0), 0);
    return Math.max(0, Number(product.stockQuantity) - inCart);
  };


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parbati Bhandar Final Cart"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end"
    >
      <div className="pb-cart-panel bg-white w-full max-w-3xl h-full flex flex-col shadow-2xl">
        <div className="pb-cart-header p-3.5 sm:p-5 bg-emerald-800 text-white">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => checkoutStep === 'checkout' ? setCheckoutStep('review') : onClose()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{checkoutStep === 'checkout' ? 'Back to cart' : 'Back to shopping'}</span>
            </button>
            <button
              type="button"
              aria-label="Close order list drawer"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white transition-colors hover:bg-emerald-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <h3 className="font-bold text-base">Parbati Bhandar Final Cart (ফর্দ)</h3>
              <p className="text-xs text-emerald-200">
                {checkoutStep === 'review' ? 'Review your basket before checkout' : 'Confirm details · Verify · Place order'}
              </p>
            </div>
          </div>
        </div>

        <div className="pb-cart-content flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {cartItemsList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-600 font-semibold">Your grocery list is empty</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Your cart is currently empty. Browse the store and add groceries to your shopping list.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
              >
                ← Back to home page
              </button>
            </div>
          ) : (
            <>
              {checkoutStep === 'checkout' && <div className="pb-3.5">
                <p className="mb-2 text-xs font-semibold text-slate-500">Your name and WhatsApp number are taken securely from your customer profile.</p>
                <input type="text" aria-label="Order Note" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="Optional note: e.g. Will pick up at 6 PM / Home delivery" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>}

              {/* Order review list — Step 1 */}
              <div className="py-2">
                {lowStockItems.length > 0 && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-900">
                    ⚠️ Order soon: {lowStockItems.map(item => item.product.name).join(', ')} {lowStockItems.length === 1 ? 'is' : 'are'} running low. The countdown is shown beside {lowStockItems.length === 1 ? 'this item' : 'each item'}.
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 pb-1.5">
                  <span>Item Name</span>
                  <span>Quantity ({cartTotalItems} total)</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cartItemsList.map((item, idx) => {
                    const { product, qty, selectedUnit, unitPrice, unitMrp, cartKey } = item;

                    return (
                      <div key={cartKey} className="pb-cart-row py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain rounded-lg"
                              />
                            ) : (
                              product.emoji || '🛍️'
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 line-clamp-2 whitespace-normal leading-snug">
                              {idx + 1}. {product.name}
                            </h4>
                            <p className="text-xs font-bold text-emerald-800 tabular-nums">
                              Qty: {selectedUnit} &times; {qty}
                            </p>
                            {isLowStockItem(product) && (
                              <LowStockNotice productId={product.id} startedAt={getLowStockStart(product)} />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="pb-cart-qty flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <button
                              type="button"
                              aria-label={`Remove one ${product.name} (${selectedUnit})`}
                              onClick={() =>
                                updateCartQty(product, -1, {
                                  selectedUnit,
                                  unitPrice,
                                  unitMrp,
                                })
                              }
                              className="p-1.5 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-extrabold text-slate-900 tabular-nums">
                              {selectedUnit} &times; {qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Add one more ${product.name} (${selectedUnit})`}
                              disabled={!product.inStock || getRemainingStock(product) <= 0}
                              onClick={() =>
                                updateCartQty(product, 1, {
                                  selectedUnit,
                                  unitPrice,
                                  unitMrp,
                                })
                              }
                              className="p-1.5 hover:bg-slate-200 text-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {checkoutStep === 'review' && (
                <section className="py-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-extrabold text-slate-900">You may also need</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Useful picks related to your basket. Add only what you need.</p>
                  </div>
                  {recommendationProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {recommendationProducts.map(product => (
                        <article key={product.id} className="pb-cart-recommendation min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                          <div className="flex h-16 sm:h-20 items-center justify-center rounded-lg bg-slate-50">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2" />
                            ) : (
                              <span className="text-3xl" aria-hidden="true">{product.emoji || '🛍️'}</span>
                            )}
                          </div>
                          <p className="mt-2 min-h-9 text-xs font-bold leading-4 text-slate-900 line-clamp-2">{product.name}</p>
                          <p className="mt-1 text-xs font-semibold text-emerald-800">₹{product.price} <span className="font-normal text-slate-500">/ {product.unit}</span></p>
                          <button type="button" onClick={() => updateCartQty(product, 1)} className="mt-2.5 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100">
                            + Add to cart
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">You’ve got everything available for now.</p>
                  )}
                </section>
              )}
              
            </>
          )}
        </div>

        {cartItemsList.length > 0 && (
          <div className="pb-cart-summary p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 tabular-nums">
              <span>Total Items in Bill</span>
              <span className="text-base text-emerald-800">{cartTotalItems} items · ₹{cartTotalPrice}</span>
            </div>
            {checkoutStep === 'review' ? (
              <>
                <button type="button" onClick={() => customerAuthenticated ? setCheckoutStep('checkout') : onRequireLogin()} className="w-full flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm">
                  {customerAuthenticated ? <>Confirm my order <span aria-hidden="true">→</span></> : <>Sign in to continue checkout <span aria-hidden="true">→</span></>}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  
                  <button type="button" onClick={clearCart} className="py-2.5 rounded-xl border border-red-200 bg-white text-red-600 font-bold text-xs">Clear Shopping List</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-900">Final step · Place your order</p>
                  <button type="button" onClick={() => setCheckoutStep('review')} className="text-xs font-bold text-emerald-700">← Edit order</button>
                </div>
                {!liveIsOpen && <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">The store is currently closed. Online orders are paused and will be available when the store opens.</div>}
                <button type="button" disabled={savingOrder || !liveIsOpen} onClick={async () => {
                  if (savingOrder) return;
                  const popup = window.open('about:blank', '_blank');
                  setSavingOrder(true);
                  try {
                    const orderNumber = await onSaveOrder();
                    if (orderNumber !== null) {
                      // Navigate the pre-opened tab as soon as Cloudflare confirms the order.
                      if (popup) {
                        try {
                          const whatsapp = new URL(whatsAppUrl);
                          whatsapp.searchParams.set('text', orderText + '\n\nYour order has been received by Parbati Bhandar. Please check My Account on the store website for the order date, time and live status.');
                          popup.location.replace(whatsapp.toString());
                        } catch { popup.location.replace(whatsAppUrl); }
                      }
                      clearCart();
                      onOrderPlaced(orderNumber);
                    } else if (popup) popup.close();
                  } finally { setSavingOrder(false); }
                }} className="w-full flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm disabled:opacity-60">
                  <MessageCircle className="w-4 h-4" />
                  <span>{savingOrder ? 'Placing order…' : liveIsOpen ? 'Place order' : 'Store is closed'}</span>
                </button>
                
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

