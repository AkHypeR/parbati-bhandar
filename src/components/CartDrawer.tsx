import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TurnstileWidget } from './TurnstileWidget';
import {
  ShoppingCart,
  ShoppingBag,
  X,
  Minus,
  Plus,
  Copy,
  MessageCircle,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { CartItem, Product } from '../utils/storeLogic';

interface CartDrawerProps {
  isOpen: boolean;
  liveIsOpen: boolean;
  onClose: () => void;
  cartItemsList: CartItem[];
  products: Product[];
  cartTotalItems: number;
  cartTotalPrice: number;
  cartTotalSaved: number;
  customerName: string;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  rememberCustomerDetails: boolean;
  setRememberCustomerDetails: (v: boolean) => void;
  onSaveOrder: (turnstileToken: string, pushSubscription?: PushSubscriptionJSON | null) => Promise<number | null>;
  setCustomerName: (v: string) => void;
  customerNote: string;
  setCustomerNote: (v: string) => void;
  updateCartQty: (
    product: Product,
    delta: number,
    option?: { selectedUnit?: string; unitPrice?: number; unitMrp?: number | null }
  ) => void;
  clearCart: () => void;
  handleCopyShoppingList: () => void;
  copiedNotice: boolean;
  whatsAppUrl: string;
  orderText: string;
}

export function CartDrawer({
  isOpen,
  liveIsOpen,
  onClose,
  cartItemsList,
  products,
  cartTotalItems,
  cartTotalPrice,
  customerName,
  customerPhone,
  setCustomerPhone,
  rememberCustomerDetails,
  setRememberCustomerDetails,
  onSaveOrder,
  setCustomerName,
  customerNote,
  setCustomerNote,
  updateCartQty,
  clearCart,
  handleCopyShoppingList,
  copiedNotice,
  whatsAppUrl,
  orderText,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'checkout'>('review');
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [pushState, setPushState] = useState<'off' | 'working' | 'on' | 'unsupported' | 'error'>('off');
  const [timerNow, setTimerNow] = useState(Date.now());
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Refresh the visible low-stock countdown once per second while the cart is open.
  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setTimerNow(Date.now());
    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  const getLowStockCountdown = (product: Product): string | null => {
    // Cart items can contain an older product snapshot. Always read the latest stock
    // and threshold from the live catalog so the countdown appears consistently.
    const currentProduct = products.find(item => item.id === product.id) || product;
    const stock = Number(currentProduct.stockQuantity);
    const configuredThreshold = Number(currentProduct.lowStockThreshold);
    // Match the cart-expiry rule: default to 5 units if no threshold is configured.
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0
      ? configuredThreshold
      : 5;
    if (!currentProduct.inStock || !Number.isFinite(stock) || stock <= 0 || stock > threshold) return null;
    try {
      const saved = JSON.parse(localStorage.getItem('parbati_bhandar_low_stock_cart_timers_v1') || '{}');
      const startedAt = saved?.[currentProduct.id];
      if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return '05:00';
      const remaining = Math.max(0, 5 * 60 * 1000 - (timerNow - startedAt));
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch {
      return '05:00';
    }
  };

  const enableOrderNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushState('unsupported');
      return;
    }
    if (!hasCustomerPhone) { setPhoneError(true); return; }
    setPushState('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushState('error'); return; }
      const keyResponse = await fetch('/api/push-key', { cache: 'no-store' });
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) throw new Error('Notifications are not configured yet.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
      });
      setPushSubscription(subscription.toJSON());
      setPushState('on');
    } catch (error) {
      console.error('Push subscription failed', error);
      setPushState('error');
    }
  };

  const urlBase64ToUint8Array = (value: string) => {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  };

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

    // Rank matching-category items first, then randomly choose from the top five.
    if (sameCategory.length > 0) {
      const topCategoryFive = [...sameCategory].sort((left, right) =>
        Number(left.bestItemRank ?? 999) - Number(right.bestItemRank ?? 999)
      ).slice(0, 5);
      return topCategoryFive.sort(() => Math.random() - 0.5);
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

  const hasCustomerName = customerName.trim().length > 0;
  const hasCustomerPhone = customerPhone.replace(/\D/g, '').length >= 10;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parbati Bhandar Final Cart"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end"
    >
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="p-4 sm:p-5 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">Parbati Bhandar Final Cart (ফর্দ)</h3>
              <p className="text-xs text-emerald-200">
                {checkoutStep === 'review' ? 'Step 1 · Review items and recommendations' : 'Step 2 · Customer details, captcha and order placement'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close order list drawer"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
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
              {checkoutStep === 'checkout' && <div className="pb-3.5 space-y-2.5">
                <div
                  className={`p-3 rounded-2xl border ${
                    nameError && !hasCustomerName
                      ? 'bg-red-50/90 border-red-300'
                      : hasCustomerName
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-amber-50/70 border-amber-200'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="cart-customer-name-input"
                      className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Customer Name (আপনার নাম) *</span>
                    </label>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        hasCustomerName
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      {hasCustomerName ? 'Ready for WhatsApp' : 'Required'}
                    </span>
                  </div>

                  <input
                    ref={nameInputRef}
                    id="cart-customer-name-input"
                    type="text"
                    required
                    aria-label="Customer Name (Required)"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (e.target.value.trim()) {
                        setNameError(false);
                      }
                    }}
                    placeholder="Enter your full name to proceed to WhatsApp *"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                      nameError && !hasCustomerName
                        ? 'border-red-400 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />

                  {nameError && !hasCustomerName && (
                    <div
                      role="alert"
                      className="flex items-center gap-1.5 text-xs font-bold text-red-700"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>Please enter your Name above before proceeding to WhatsApp.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="cart-customer-phone" className="text-xs font-extrabold text-slate-800">Phone number (WhatsApp) *</label>
                  <input id="cart-customer-phone" type="tel" inputMode="tel" value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setPhoneError(false); }} placeholder="Enter 10-digit mobile number" className={"w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm font-bold " + (phoneError ? "border-red-400" : "border-slate-300")} />
                  {phoneError && <p className="text-xs font-bold text-red-600">Enter a valid phone number (at least 10 digits).</p>}
                </div>
                <label className="flex items-start gap-2 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberCustomerDetails}
                    onChange={(e) => setRememberCustomerDetails(e.target.checked)}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span><strong>Remember my name and phone on this device</strong><br />Optional. Saved only in this browser to make your next checkout faster. You can untick this anytime.</span>
                </label>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                  <div className="text-xs font-bold text-emerald-900">Order status notifications (optional)</div>
                  <p className="text-[11px] text-emerald-800">Get an alert when your order is ready, unavailable, cancelled or completed. Allow notifications on this device.</p>
                  <button type="button" onClick={enableOrderNotifications} disabled={pushState === 'working' || pushState === 'on'} className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                    {pushState === 'working' ? 'Enabling…' : pushState === 'on' ? '✓ Notifications enabled for this order' : 'Enable order notifications'}
                  </button>
                  {pushState === 'unsupported' && <p className="text-[11px] text-amber-800">This browser or device does not support web push notifications.</p>}
                  {pushState === 'error' && <p className="text-[11px] text-red-700">Could not enable notifications. Check browser permission and try again.</p>}
                </div>
                <input
                  type="text"
                  aria-label="Order Note"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Optional note: e.g. Will pick up at 6 PM / Home delivery"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>}

              {/* Order review list — Step 1 */}
              <div className="py-2">
                {cartItemsList.some(item => getLowStockCountdown(item.product) !== null) && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                    ⚠️ Order soon: {cartItemsList.filter(item => getLowStockCountdown(item.product) !== null).map(item => item.product.name).join(', ')} {cartItemsList.filter(item => getLowStockCountdown(item.product) !== null).length === 1 ? 'is' : 'are'} low in stock. Check the countdown beside {cartItemsList.filter(item => getLowStockCountdown(item.product) !== null).length === 1 ? 'this item' : 'these items'}.
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
                      <div key={cartKey} className="py-3 flex items-center justify-between gap-3">
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
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {idx + 1}. {product.name}
                            </h4>
                            <p className="text-xs font-bold text-emerald-800 tabular-nums">
                              Qty: {selectedUnit} &times; {qty}
                            </p>
                            {getLowStockCountdown(product) !== null && (
                              <div className="mt-1 flex flex-col items-start gap-1">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
                                  ⚠️ Order soon — low stock!
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-700">
                                  ⏳ Item leaves your cart in {getLowStockCountdown(product)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
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
                <section className="py-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Complete your grocery list</h4>
                      <p className="text-[11px] text-slate-500">Random picks from matching categories, or popular products if no match is available.</p>
                    </div>
                  </div>
                  {recommendationProducts.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {recommendationProducts.map(product => (
                      <div key={product.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl">{product.emoji || '🛍️'}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{product.name}</p>
                            <p className="text-[11px] text-emerald-700">₹{product.price} / {product.unit}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => updateCartQty(product, 1)} className="mt-2 w-full rounded-lg bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-800">+ Add to order</button>
                      </div>
                    ))}
                  </div>
                  )}
                  {recommendationProducts.length === 0 && <p className="text-xs text-slate-500">No other in-stock products are available right now.</p>}
                </section>
              )}
              {checkoutStep === 'checkout' && <>
                {/* Text-Format WhatsApp Bill Preview (Name & Quantity Only) */}
                <div className="pt-3">
                  <div className="p-3 rounded-2xl bg-slate-900 text-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>WhatsApp Text Bill Preview (Name &amp; Quantity)</span>
                      </span>
                      <span className="tabular-nums">{cartTotalItems} items</span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 max-h-36 overflow-y-auto">
                      {orderText}
                    </pre>
                  </div>
                </div>
              </>}
            </>
          )}
          {checkoutStep === 'checkout' && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold text-slate-700">Security check</p>
            <TurnstileWidget onVerify={setTurnstileToken} />
          </div>}
        </div>

        {cartItemsList.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 tabular-nums">
              <span>Total Items in Bill</span>
              <span className="text-base text-emerald-800">{cartTotalItems} items · ₹{cartTotalPrice}</span>
            </div>
            {checkoutStep === 'review' ? (
              <>
                <button type="button" onClick={() => setCheckoutStep('checkout')} className="w-full flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm">
                  Confirm my order <span aria-hidden="true">→</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={handleCopyShoppingList} className="py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-xs">{copiedNotice ? 'Copied Bill!' : 'Copy Text Bill'}</button>
                  <button type="button" onClick={clearCart} className="py-2.5 rounded-xl border border-red-200 bg-white text-red-600 font-bold text-xs">Clear Shopping List</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-900">Step 2 of 2 · Place your order</p>
                  <button type="button" onClick={() => { setCheckoutStep('review'); setTurnstileToken(''); }} className="text-xs font-bold text-emerald-700">← Edit order</button>
                </div>
                {!liveIsOpen && <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">The store is currently closed. Online orders are paused and will be available when the store opens.</div>}
                <button type="button" disabled={savingOrder || !liveIsOpen} onClick={async () => {
                  if (!hasCustomerName) { setNameError(true); nameInputRef.current?.focus(); return; }
                  if (!hasCustomerPhone) { setPhoneError(true); return; }
                  if (!turnstileToken) { window.alert('Please complete the security check first.'); return; }
                  if (savingOrder) return;
                  const popup = window.open('about:blank', '_blank');
                  setSavingOrder(true);
                  try {
                    const orderNumber = await onSaveOrder(turnstileToken, pushSubscription);
                    if (orderNumber !== null) {
                      clearCart();
                      setTurnstileToken('');
                      if (popup) {
                        try {
                          const whatsapp = new URL(whatsAppUrl);
                          whatsapp.searchParams.set('text', `${orderText}\\n\\nOrder Reference: #${orderNumber}\\nKeep this number and your phone number to track your order on the store website.`);
                          popup.location.href = whatsapp.toString();
                        } catch { popup.location.href = whatsAppUrl; }
                      }
                      onClose();
                    } else if (popup) popup.close();
                  } finally { setSavingOrder(false); }
                }} className="w-full flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm disabled:opacity-60">
                  <MessageCircle className="w-4 h-4" />
                  <span>{savingOrder ? 'Placing order…' : liveIsOpen ? 'Place Order & Proceed' : 'Store is closed'}</span>
                </button>
                <button type="button" onClick={handleCopyShoppingList} className="w-full py-2 text-xs font-bold text-slate-600">{copiedNotice ? 'Copied Bill!' : 'Copy Text Bill'}</button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

