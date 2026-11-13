import React, { useState, useRef } from 'react';
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
  onClose: () => void;
  cartItemsList: CartItem[];
  cartTotalItems: number;
  cartTotalPrice: number;
  cartTotalSaved: number;
  customerName: string;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  onSaveOrder: (turnstileToken: string) => Promise<boolean>;
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
  onClose,
  cartItemsList,
  cartTotalItems,
  customerName,
  customerPhone,
  setCustomerPhone,
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
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const hasCustomerName = customerName.trim().length > 0;
  const hasCustomerPhone = customerPhone.replace(/\D/g, '').length >= 10;

  const handleWhatsAppProceed = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!hasCustomerName) { setNameError(true); nameInputRef.current?.focus(); return; }
    if (!hasCustomerPhone) { setPhoneError(true); return; }
    if (!turnstileToken) { window.alert('Please complete the security check first.'); return; }
    if (savingOrder) return;
    const popup = window.open('about:blank', '_blank');
    setSavingOrder(true);
    try { const saved = await onSaveOrder(turnstileToken); if (saved && popup) { clearCart(); popup.location.href = whatsAppUrl; setTurnstileToken(''); onClose(); } else if (popup) popup.close(); }
    finally { setSavingOrder(false); }
  };

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
                Enter your name &amp; pass text bill (Name &amp; Quantity) to WhatsApp
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
                Choose any weight (e.g. 200g, 500g, 2 kg) or pack variety and tap &ldquo;+ Add&rdquo;
                to prepare your shopping list.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Required Customer Name before passing into WhatsApp */}
              <div className="pb-3.5 space-y-2.5">
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
                <input
                  type="text"
                  aria-label="Order Note"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Optional note: e.g. Will pick up at 6 PM / Home delivery"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Side Cart Items List — Only Shows Item Name and Quantity */}
              <div className="py-2">
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
                              onClick={() =>
                                updateCartQty(product, 1, {
                                  selectedUnit,
                                  unitPrice,
                                  unitMrp,
                                })
                              }
                              className="p-1.5 hover:bg-slate-200 text-slate-700 cursor-pointer"
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
            </>
          )}
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold text-slate-700">Security check</p>
            <TurnstileWidget onVerify={setTurnstileToken} />
          </div>
        </div>

        {cartItemsList.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 tabular-nums">
              <span>Total Items in Bill</span>
              <span className="text-base text-emerald-800">{cartTotalItems} items</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span>{copiedNotice ? 'Copied Bill!' : 'Copy Text Bill'}</span>
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppProceed}
                className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm shadow-sm cursor-pointer whitespace-nowrap transition-colors ${
                  hasCustomerName
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                }`}
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>{savingOrder ? 'Saving order…' : hasCustomerName && hasCustomerPhone ? 'Save Order & Proceed' : 'Enter Name, Phone & Proceed'}</span>
              </a>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="w-full text-center text-xs text-red-600 hover:underline pt-1 font-medium cursor-pointer"
            >
              Clear Shopping List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

