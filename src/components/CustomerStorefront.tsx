import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  X,
  Phone,
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle2,
  Package,
  ClipboardList,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ShoppingCart,
  Minus,
  MessageCircle,
  ArrowUpDown,
  Navigation,
  Star,
  QrCode,
  Scale,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Pause,
  Play,
} from 'lucide-react';
import {
  CATEGORIES,
  CartMap,
  CartItem,
  Product,
  StoreSettings,
  calculateDiscountDetails,
  isProductLowStock,
  getWeightOptionsForProduct,
  calculateCustomWeightOption,
  makeCartKey,
  buildHeroSlides,
} from '../utils/storeLogic';

interface CustomerStorefrontProps {
  storeSettings: StoreSettings;
  currentPage: 'home' | 'track' | 'history' | 'cart';
  onNavigate: (path: string) => void;
  liveIsOpen: boolean;
  inStockCount: number;
  products: Product[];
  filteredCustomerProducts: Product[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  cart: CartMap;
  cartItemsList: CartItem[];
  cartTotalItems: number;
  cartTotalPrice: number;
  cartTotalSaved?: number;
  updateCartQty: (
    product: Product,
    delta: number,
    option?: { selectedUnit?: string; unitPrice?: number; unitMrp?: number | null }
  ) => void;
  setIsQrModalOpen: (open: boolean) => void;
  onSecretOwnerAccess: () => void;
  lastOrderNumber?: string;
  lastOrderCreatedAt?: number;
  lastOrderPhone?: string;
}

export function CustomerStorefront({
  storeSettings,
  currentPage,
  onNavigate,
  liveIsOpen,
  inStockCount,
  products,
  filteredCustomerProducts,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  inStockOnly,
  setInStockOnly,
  sortBy,
  setSortBy,
  cart,
  cartItemsList,
  cartTotalItems,
  cartTotalPrice,
  cartTotalSaved = 0,
  updateCartQty,
  setIsQrModalOpen,
  onSecretOwnerAccess,
  lastOrderNumber = '',
  lastOrderCreatedAt = 0,
  lastOrderPhone = '',
}: CustomerStorefrontProps) {
  const [showWelcomePromo, setShowWelcomePromo] = useState(false);
  useEffect(() => {
    if (currentPage !== 'home') return;
    try {
      if (sessionStorage.getItem('pb-welcome-promo-seen') === '1') return;
    } catch { /* Continue without session storage when unavailable. */ }
    const timer = window.setTimeout(() => {
      setShowWelcomePromo(true);
      try { sessionStorage.setItem('pb-welcome-promo-seen', '1'); } catch { /* Ignore storage restrictions. */ }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [currentPage]);
  const closeWelcomePromo = () => {
    setShowWelcomePromo(false);
    try { sessionStorage.setItem('pb-welcome-promo-seen', '1'); } catch { /* Ignore storage restrictions. */ }
  };
  const [trackingOrderNumber, setTrackingOrderNumber] = useState(lastOrderNumber);
  const [dealsSearch, setDealsSearch] = useState('');
  const [trackingPhone, setTrackingPhone] = useState(lastOrderPhone);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [ordersView, setOrdersView] = useState<'track' | 'history'>('track');
  useEffect(() => {
    if (currentPage === 'track') setOrdersView('track');
    if (currentPage === 'history') setOrdersView('history');
  }, [currentPage]);
  useEffect(() => {
    if (lastOrderNumber) {
      setTrackingOrderNumber(lastOrderNumber);
      setTrackingResult(null);
      setTrackingError('');
    }
  }, [lastOrderNumber]);
  useEffect(() => {
    if (lastOrderPhone) setTrackingPhone(lastOrderPhone);
  }, [lastOrderPhone]);
  const readOrderApiResponse = async (response: Response) => {
    const body = await response.text();
    let data: any;
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      throw new Error(
        response.status === 404 || body.trimStart().startsWith('<')
          ? 'Order history service is not available in this website deployment yet. Please try again after the latest Cloudflare deployment finishes.'
          : 'The order service returned an invalid response. Please try again.'
      );
    }
    return data;
  };

  const fetchTrackedOrder = async (orderNumber: string, phone: string) => {
    const response = await fetch('/api/orders/track?orderNumber=' + encodeURIComponent(orderNumber) + '&phone=' + encodeURIComponent(phone), { cache: 'no-store' });
    const data = await readOrderApiResponse(response);
    if (!response.ok) throw new Error(data.error || 'Unable to find order');
    return data;
  };
  const loadOrderHistory = async (phoneValue = trackingPhone) => {
    const cleanPhone = phoneValue.replace(/\D/g, '');
    if (cleanPhone.length < 10) { setHistoryError('Enter the phone number used at checkout to view your orders.'); return; }
    setHistoryLoading(true); setHistoryError(''); setHistoryLoaded(false);
    try {
      const response = await fetch('/api/orders/track?history=1&phone=' + encodeURIComponent(cleanPhone), { cache: 'no-store' });
      const data = await readOrderApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to load order history');
      setOrderHistory(Array.isArray(data.orders) ? data.orders : []);
      setHistoryLoaded(true);
    } catch (error) {
      setHistoryError((error as Error).message || 'Unable to load order history.');
    } finally { setHistoryLoading(false); }
  };
  useEffect(() => {
    if (!lastOrderNumber || trackingPhone.replace(/\D/g, '').length < 10) return;
    void loadOrderHistory(trackingPhone);
  }, [lastOrderNumber, trackingPhone]);
  const trackOrder = async (event: React.FormEvent) => {
    event.preventDefault(); setTrackingLoading(true); setTrackingError(''); setTrackingResult(null);
    try { setTrackingResult(await fetchTrackedOrder(trackingOrderNumber, trackingPhone)); }
    catch (error) { setTrackingError((error as Error).message); } finally { setTrackingLoading(false); }
  };
  const trackingStep = trackingResult
    ? ({ new: 0, review: 1, ready: 2, completed: 3, unavailable: 1 } as Record<string, number>)[trackingResult.status] ?? -1
    : -1;

  // Refresh the matching order in the background so customers see owner updates
  // without having to submit the tracking form again.
  useEffect(() => {
    if (!trackingResult?.orderNumber || !trackingPhone || ['completed','cancelled'].includes(trackingResult.status)) return;
    const timer = window.setInterval(() => {
      void fetchTrackedOrder(String(trackingResult.orderNumber), trackingPhone)
        .then(setTrackingResult)
        .catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [trackingResult?.orderNumber, trackingResult?.status, trackingPhone]);
  // Per-product selected variety or weight option label
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, { label: string; price: number; mrp: number | null; inStock: boolean }>
  >({});

  // Per-product custom weight input state
  const [customWeightOpen, setCustomWeightOpen] = useState<Record<string, boolean>>({});
  const [customWeightAmount, setCustomWeightAmount] = useState<Record<string, string>>({});
  const [customWeightUnit, setCustomWeightUnit] = useState<Record<string, 'g' | 'kg' | 'ml' | 'L'>>(
    {}
  );

  // Location / Store Info Expandable Pill
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [isSearchSubmitted, setIsSearchSubmitted] = useState(false);

  // Active slide index and auto-play state for the Merged Festive + Best 5 Hero Slider
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isAutoSlidePaused, setIsAutoSlidePaused] = useState(false);
  const [isSliderHovered, setIsSliderHovered] = useState(false);

  // Secret 5-tap counter on the store brand logo for owner-only access
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretLogoTap = () => {
    logoTapCountRef.current += 1;
    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }
    if (logoTapCountRef.current >= 5) {
      logoTapCountRef.current = 0;
      onSecretOwnerAccess();
      return;
    }
    logoTapTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
    }, 2200);
  };

  const handleSearchInputChange = (val: string) => { setSearchQuery(val); };
  const searchSuggestions = searchQuery.trim().length > 0
    ? products.filter(product => product.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()))
      .sort((a, b) => { const q = searchQuery.trim().toLocaleLowerCase(); return Number(!a.name.toLocaleLowerCase().startsWith(q)) - Number(!b.name.toLocaleLowerCase().startsWith(q)) || a.name.localeCompare(b.name); }).slice(0, 6)
    : [];

  // Stock is tracked per product, so all selected sizes/varieties share the same stock limit.
  const getRemainingStock = (product: Product) => {
    if (!Number.isFinite(Number(product.stockQuantity))) return Number.POSITIVE_INFINITY;
    const alreadyInCart = Object.values(cart).reduce(
      (total, item) => total + (item.product.id === product.id ? Number(item.qty || 0) : 0),
      0
    );
    return Math.max(0, Number(product.stockQuantity) - alreadyInCart);
  };

  const getActiveOptionForProduct = (product: Product) => {
    if (selectedOptions[product.id]) {
      return selectedOptions[product.id];
    }
    if (product.varieties && product.varieties.length > 0) {
      const firstAvailable =
        product.varieties.find((v) => v.inStock) || product.varieties[0];
      return {
        label: firstAvailable.label,
        price: Number(firstAvailable.price),
        mrp: firstAvailable.mrp ? Number(firstAvailable.mrp) : null,
        inStock: firstAvailable.inStock && product.inStock,
      };
    }
    return {
      label: product.unit || '1 unit',
      price: Number(product.price),
      mrp: product.mrp ? Number(product.mrp) : null,
      inStock: product.inStock,
    };
  };

  const handleApplyCustomWeight = (product: Product) => {
    const rawVal = Number(customWeightAmount[product.id]);
    const unit = customWeightUnit[product.id] || 'g';
    const computed = calculateCustomWeightOption(product, rawVal, unit);
    if (!computed) return;
    setSelectedOptions((prev) => ({
      ...prev,
      [product.id]: {
        label: computed.label,
        price: computed.price,
        mrp: computed.mrp,
        inStock: product.inStock,
      },
    }));
    setCustomWeightOpen((prev) => ({ ...prev, [product.id]: false }));
  };

  const heroSlides = buildHeroSlides(products, storeSettings);
  const safeSlideIndex =
    heroSlides.length > 0 ? Math.min(activeSlideIndex, heroSlides.length - 1) : 0;
  const currentSlide = heroSlides[safeSlideIndex] || null;

  useEffect(() => {
    if (heroSlides.length <= 1 || isAutoSlidePaused || isSliderHovered) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [heroSlides.length, isAutoSlidePaused, isSliderHovered]);

  const handlePrevSlide = () => {
    if (heroSlides.length === 0) return;
    setActiveSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleNextSlide = () => {
    if (heroSlides.length === 0) return;
    setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const bestItemsSectionRef = useRef<HTMLDivElement | null>(null);

  const greetingTop = storeSettings.greetingTop || 'Nomoshkar';
  const greetingMain = storeSettings.greetingMain || 'Grahok';
  const deliveryEtaMins = storeSettings.deliveryEtaMins || '10';
  const isChristmasSeason = /christmas|xmas/i.test(`${storeSettings.occasionTitle || ''} ${storeSettings.occasionTag || ''}`) || [10, 11].includes(new Date().getMonth());

  return (
    <div className="flex-1 flex flex-col bg-[#f4f8f3] text-slate-900 pb-32 sm:pb-28">
      {isChristmasSeason && <div className="pb-christmas-sky fixed inset-0 z-[70] overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({length:18},(_,i)=><span key={i} className="pb-snowflake" style={{left:`${(i*37)%100}%`,animationDelay:`${(i%7)*-1.8}s`,animationDuration:`${8+(i%5)*2}s`,fontSize:`${10+(i%4)*5}px`}}>❄</span>)}
        <span className="pb-christmas-twinkle absolute right-[8%] top-28 text-xl">✦</span><span className="pb-christmas-twinkle absolute left-[6%] top-[42%] text-sm">✧</span>
      </div>}

      {/* ===================================================================== */}
      {/* TOP MOBILE-FIRST APP BAR WITH SHOP NAME                               */}
      {/* ===================================================================== */}
      <header className="bg-[#087a45] text-white border-b border-emerald-900/20 shadow-sm">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 pt-3 pb-2">
          {/* Row 1: Profile | Shop Name (5-tap secret owner access) | Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: User / Store Info Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/account')}
                aria-label="My account and orders"
                aria-expanded={currentPage === 'history'}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white cursor-pointer shrink-0 transition-colors"
              >
                <User className="w-4 h-4" />
              </button>
            </div>

            {/* Center: Shop Name Header (Secret 5-Tap for Owner Portal) */}
            <button
              type="button"
              onClick={handleSecretLogoTap}
              aria-label="Parbati Bhandar Shop Name"
              className="flex flex-col items-center justify-center select-none cursor-pointer group focus:outline-none min-w-0 px-1 text-center"
              title={storeSettings.storeName || 'Parbati Bhandar (পার্বতী ভান্ডার)'}
            >
              <div className="flex items-center justify-center gap-1.5 min-w-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-[#0d647d] shrink-0" />
                <span className="text-base sm:text-xl font-black tracking-tight text-white leading-tight">
                  {(storeSettings.storeName || 'Parbati Bhandar (পার্বতী ভান্ডার)')
                    .replace(/\s*\(.*\)\s*$/, '')}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-100 leading-tight">
                {(storeSettings.storeName || 'Parbati Bhandar (পার্বতী ভান্ডার)').match(
                  /\((.*)\)/
                )?.[1] || 'পার্বতী ভান্ডার'}
              </span>
              <span className="block h-0.5 bg-lime-300 rounded-full w-20 sm:w-28 mt-0.5" />
              {!liveIsOpen && (
                <span role="status" aria-live="polite" className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-gradient-to-r from-[#7f1d1d] via-[#be123c] to-[#9f1239] px-3 py-1.5 text-[9px] sm:text-[10px] font-black tracking-[.12em] text-white shadow-[0_4px_16px_rgba(190,18,60,.35)] animate-[closedGlow_2.4s_ease-in-out_infinite]"><span className="relative flex h-2.5 w-2.5 shrink-0"><span className="absolute inset-0 rounded-full bg-white/80 animate-ping motion-reduce:animate-none"/><span className="relative m-auto h-2 w-2 rounded-full bg-amber-300 ring-2 ring-white/40"/></span><span>🌙 STORE CLOSED</span><span aria-hidden="true" className="text-amber-200 text-xs">✦</span><span className="font-semibold tracking-normal text-rose-100">We’ll welcome you soon</span></span>
              )}
            </button>

            {/* Right: Call, WhatsApp & QR Code Quick Buttons */}
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${(storeSettings.phone || '+919734765207').replace(/\s+/g, '')}`}
                aria-label="Call Store"
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center justify-center transition-colors"
                title="Call Parbati Bhandar: 097347 65207"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${storeSettings.whatsappNumber || '919734765207'}?text=${encodeURIComponent(
                  'নমস্কার পার্বতী ভান্ডার (Parbati Bhandar), আমি কিছু মুদিখানার জিনিসের খোঁজ নিতে চাই।'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Store"
                className="w-9 h-9 rounded-full bg-[#f6c744] hover:bg-[#f0b91f] text-emerald-950 flex items-center justify-center shadow-2xs transition-colors"
                title="WhatsApp Parbati Bhandar"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                aria-label="Shop QR Poster"
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 flex items-center justify-center cursor-pointer transition-colors"
                title="Show Store QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer / Burdwan Location Line */}
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/10 border border-white/15 px-3 py-2">
            <button
              type="button"
              onClick={() => setIsAddressExpanded(!isAddressExpanded)}
              className="flex-1 min-w-0 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-white/15 text-white font-extrabold text-xs tracking-tight">
                  Swasti Pally - BURDWAN
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    liveIsOpen
                      ? 'bg-lime-100 text-emerald-900'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      liveIsOpen ? 'bg-emerald-600' : 'bg-red-500'
                    }`}
                  />
                  {liveIsOpen ? 'Open • খোলা আছে' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p className="text-xs sm:text-sm text-emerald-50 font-medium truncate">
                  {storeSettings.address || 'Swasti Pally, Gangpur, Dis-Burdwan, 713103, BURD...'}
                </p>
                {isAddressExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-700 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-700 shrink-0" />
                )}
              </div>
            </button>
          </div>

          {/* Expandable Store Info Card when Location Row is tapped */}
          {isAddressExpanded && (
            <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-700" />
                  <span>{storeSettings.storeName}</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>Local grocery • {inStockCount} Items Live</span>
                </span>
              </div>
              <p className="text-slate-600">{storeSettings.tagline}</p>
              <div className="flex flex-wrap items-center gap-4 text-slate-700 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  {storeSettings.timings}
                </span>
                <a
                  href={'https://maps.app.goo.gl/yrXRW4uuwWjaEzQi6?g_st=ac'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Customer order centre */}
      {(currentPage === 'track' || currentPage === 'history') && (
        <section id="customer-order-tools" className="mx-auto w-full max-w-4xl scroll-mt-4 px-3 py-4 sm:px-6" aria-label="My orders">
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.08)]">
            <div className="relative overflow-hidden bg-[#073f2b] px-5 py-5 text-white sm:px-7 sm:py-6">
              <div aria-hidden="true" className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10" />
              <div aria-hidden="true" className="absolute -right-2 -top-12 h-40 w-40 rounded-full bg-emerald-300/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-100"><Package className="h-3.5 w-3.5" /> Customer order centre</div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Your orders, in one place.</h2>
                  <p className="mt-1.5 max-w-lg text-xs leading-5 text-emerald-50/80 sm:text-sm">Follow an order's progress or review your recent purchases from Parbati Bhandar.</p>
                </div>
                <button type="button" onClick={() => onNavigate('/')} aria-label="Close orders" className="relative rounded-full border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20"><X className="h-4 w-4" /></button>
              </div>
              <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-emerald-100/90">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-lime-300" /> Private order lookup</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-lime-300" /> History available for 7 days</span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {lastOrderCreatedAt > 0 && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Latest order received</p><p className="text-sm font-bold text-slate-900">{new Date(lastOrderCreatedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</p></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Order options">
                <button type="button" role="tab" aria-selected={ordersView === 'track'} onClick={() => onNavigate('/track-order')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold transition ${ordersView === 'track' ? 'bg-white text-[#07543a] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Package className="h-4 w-4" /> Track order</button>
                <button type="button" role="tab" aria-selected={ordersView === 'history'} onClick={() => { onNavigate('/previous-orders'); if (!historyLoaded && trackingPhone.replace(/\D/g, '').length >= 10) void loadOrderHistory(); }} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold transition ${ordersView === 'history' ? 'bg-white text-[#07543a] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><ClipboardList className="h-4 w-4" /> Previous orders</button>
              </div>

              {ordersView === 'track' ? (
                <div className="pt-5">
                  <div className="mb-4"><h3 className="text-lg font-black text-slate-900">Track your order</h3><p className="mt-1 text-xs leading-5 text-slate-500">Enter the order number and the same phone number you used at checkout.</p></div>
                  <form onSubmit={trackOrder} className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
                    <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Order number</span><input required inputMode="numeric" value={trackingOrderNumber} onChange={e=>setTrackingOrderNumber(e.target.value)} placeholder="e.g. 1024" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></label>
                    <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Checkout phone number</span><input required inputMode="tel" value={trackingPhone} onChange={e=>setTrackingPhone(e.target.value)} placeholder="10-digit mobile number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></label>
                    <button disabled={trackingLoading} className="self-end inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#087044] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#065b37] disabled:cursor-not-allowed disabled:opacity-60">{trackingLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Track order'} <ArrowRight className="h-4 w-4" /></button>
                  </form>
                  {trackingError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{trackingError}</p>}

                  {trackingResult && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 px-4 py-4 sm:px-5">
                        <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Order details</p><h4 className="mt-1 text-xl font-black text-slate-900">Order #{trackingResult.orderNumber}</h4><p className="mt-1 text-[11px] text-slate-500">Placed {new Date(trackingResult.createdAt).toLocaleString()}</p></div>
                        <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order total</p><p className="mt-1 text-xl font-black tabular-nums text-[#07543a]">₹{Number(trackingResult.total || 0).toFixed(2)}</p><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><RefreshCw className="h-3 w-3" /> Live status updates</span></div>
                      </div>
                      {trackingResult.status === 'cancelled' ? (
                        <div className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> This order was cancelled. The items were not processed. Please contact the store if you need help.</div>
                      ) : (
                        <div className="px-4 pt-5 sm:px-5">
                          <div className="grid grid-cols-4 gap-1.5">
                            {['Received','Preparing','Ready','Completed'].map((label,index)=>{const active=trackingStep>=index;return <div key={label} className="min-w-0 text-center"><div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-black ${active?'bg-emerald-700 text-white':'bg-slate-100 text-slate-400'}`}>{active?<CheckCircle2 className="h-4 w-4"/>:index+1}</div><p className={`mt-2 text-[9px] font-bold sm:text-[11px] ${active?'text-emerald-800':'text-slate-400'}`}>{label}</p></div>})}
                          </div>
                          <div className="relative mt-[-13px] mx-[12.5%] -z-0 h-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{width:`${Math.max(0,Math.min(100,trackingStep/3*100))}%`}} /></div>
                        </div>
                      )}
                      {trackingResult.status === 'unavailable' && <p className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 sm:mx-5">There is an availability update for one or more items. Please review the item details below.</p>}
                      {trackingResult.confirmedAt && <p className="px-4 pt-3 text-[11px] text-slate-500 sm:px-5">Confirmed: {new Date(trackingResult.confirmedAt).toLocaleString()}</p>}
                      <div className="px-4 pb-4 pt-4 sm:px-5">
                        <div className="mb-2 flex items-center justify-between"><h5 className="text-sm font-extrabold text-slate-900">Items in this order</h5><span className="text-[10px] font-semibold text-slate-400">{trackingResult.items.length} item(s)</span></div>
                        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                          {trackingResult.items.map((item:any,index:number)=><div key={index} className="flex items-center justify-between gap-3 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{item.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{item.quantity} {item.unit} × ₹{Number(item.price || 0).toFixed(2)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${trackingResult.status==='cancelled'?'bg-slate-100 text-slate-500':item.unavailable?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{trackingResult.status==='cancelled'?'Not processed':item.unavailable?'Unavailable':'Available'}</span></div><span className="shrink-0 text-sm font-extrabold tabular-nums text-slate-900">₹{Number(item.lineTotal ?? Number(item.price || 0)*Number(item.quantity || 0)).toFixed(2)}</span></div>)}
                        </div>
                        <p className="mt-3 text-center text-[10px] text-slate-400">Order status refreshes automatically every 15 seconds while in progress.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-5">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-lg font-black text-slate-900">Your previous orders</h3><p className="mt-1 text-xs text-slate-500">Orders placed using this phone number.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800"><CalendarDays className="h-3.5 w-3.5" /> Last 7 days</span></div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Checkout phone number</span><input inputMode="tel" value={trackingPhone} onChange={e=>setTrackingPhone(e.target.value)} placeholder="Enter your 10-digit phone number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></label>
                    <button type="button" onClick={()=>void loadOrderHistory()} disabled={historyLoading || trackingPhone.replace(/\D/g,'').length<10} className="self-end inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">{historyLoading?<RefreshCw className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>} Refresh history</button>
                  </div>
                  {historyError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/>{historyError}</p>}
                  {historyLoading && <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-8 text-sm font-semibold text-slate-500"><RefreshCw className="h-4 w-4 animate-spin"/> Loading your order history…</div>}
                  {historyLoaded && !historyLoading && (orderHistory.length===0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-700">No recent orders found</p><p className="mt-1 text-xs text-slate-500">There are no orders for this phone number in the last 7 days.</p></div> : <div className="mt-4 space-y-3">{orderHistory.map((order:any)=><article key={order.orderNumber} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-emerald-200 hover:shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order reference</p><p className="text-base font-black text-slate-900">#{order.orderNumber}</p></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${order.status==='completed'?'bg-emerald-100 text-emerald-800':order.status==='cancelled'?'bg-rose-100 text-rose-700':order.status==='ready'?'bg-sky-100 text-sky-800':'bg-amber-100 text-amber-800'}`}>{({new:'Order received',review:'Order received',ready:'Ready for pickup',completed:'Completed',unavailable:'Availability update',cancelled:'Cancelled'} as Record<string,string>)[order.status] || order.status}</span></div>
                    <div className="px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5"/>{new Date(order.createdAt).toLocaleString()}</span><span className="text-base font-black tabular-nums text-[#07543a]">₹{Number(order.total||0).toFixed(2)}</span></div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-500">{order.items.length} item(s) · {order.items.reduce((sum:number,item:any)=>sum+Number(item.quantity||0),0)} total quantity</span><button type="button" onClick={async()=>{setTrackingOrderNumber(String(order.orderNumber));setOrdersView('track');setTrackingError('');setTrackingResult(null);setTrackingLoading(true);try{setTrackingResult(await fetchTrackedOrder(String(order.orderNumber),trackingPhone));}catch(error){setTrackingError((error as Error).message);}finally{setTrackingLoading(false);}}} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 transition hover:bg-emerald-50">Track this order <ArrowRight className="h-3.5 w-3.5"/></button></div>
                    </div>
                  </article>)}</div>)}
                  {!historyLoaded && !historyLoading && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">Enter your checkout phone number and select <strong>Refresh history</strong> to find your recent purchases.</div>}
                  <p className="mt-4 text-center text-[10px] leading-5 text-slate-400">For privacy, order history is matched to your checkout phone number and automatically removed after 7 days.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {currentPage === 'home' && (<>
      {/* ===================================================================== */}
      {/* STICKY SEARCH BAR & CATEGORY RIBBON (Follows User on Scroll)          */}
      {/* ===================================================================== */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-3 space-y-2">
          <div className="flex items-center gap-2">
            {/* Rounded Pill Search Bar (like "Search for 'Coffee'" in screenshot) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search store products"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setIsSearchSubmitted(true);
                    setSelectedCategory('all');
                    setInStockOnly(false);
                    setTimeout(() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }
                }}
                placeholder='Search for "Miniket Rice", "Atta", "Mustard Oil", "Ghee"...'
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium border border-emerald-200 shadow-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                autoComplete="off"
              />
              {searchSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><p className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Suggested products</p>{searchSuggestions.map(product => <button key={product.id} type="button" onClick={() => { setSearchQuery(product.name); setIsSearchSubmitted(true); setSelectedCategory("all"); setInStockOnly(false); setTimeout(() => catalogSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} className="flex w-full items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50 active:bg-emerald-100"><span className="min-w-0 truncate">{product.name}</span><span className="shrink-0 text-xs text-slate-400">{product.category}</span></button>)}</div>}
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={() => { setSearchQuery(''); setIsSearchSubmitted(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Compact My Order Button in Sticky Header */}
            <button
              type="button"
              onClick={() => onNavigate('/cart')}
              aria-label="Open My Order List"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-extrabold text-xs shadow-2xs cursor-pointer shrink-0 tabular-nums"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">My Order</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-white text-[10px] font-black">
                {cartTotalItems}
              </span>
            </button>
          </div>

          {/* Horizontal Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? products.length
                  : products.filter((p) => p.category === cat.id).length;

              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0d647d] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showWelcomePromo && currentPage === 'home' && !isSearchSubmitted && (() => {
        const marketItems = [
          {icon:'🥬',label:'Fresh greens',tone:'bg-emerald-100'},
          {icon:'🍊',label:'Seasonal fruits',tone:'bg-orange-100'},
          {icon:'🥕',label:'Daily essentials',tone:'bg-amber-100'},
          {icon:'🍅',label:'Kitchen staples',tone:'bg-rose-100'},
          {icon:'🫑',label:'Fresh picks',tone:'bg-lime-100'},
          {icon:'🧺',label:'Local groceries',tone:'bg-sky-100'}
        ];
        return <div className="pb-promo-overlay fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Welcome to Parbati Bhandar" onMouseDown={event => { if (event.target === event.currentTarget) closeWelcomePromo(); }}>
          <div className="pb-promo-card relative mx-auto flex max-h-[88dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(0,0,0,.38)]">
            <button type="button" onClick={closeWelcomePromo} aria-label="Close welcome promotion" className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-slate-950/65 text-white shadow-lg transition hover:rotate-90 hover:bg-slate-900"><X className="h-5 w-5"/></button>
            <div className="relative min-h-[270px] overflow-hidden bg-gradient-to-br from-[#dff7e9] via-[#fff4d8] to-[#ffe4d5] px-5 pb-5 pt-7 sm:min-h-[300px]">
              <div aria-hidden="true" className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/65 blur-2xl"/>
              <div aria-hidden="true" className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-emerald-200/60 blur-2xl"/>
              <div className="relative z-10 text-center"><span className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[.2em] text-emerald-800 shadow-sm">Your neighbourhood store</span><h2 className="mt-3 text-[30px] font-black leading-[1.05] tracking-tight text-[#07543b] sm:text-4xl">A little freshness<br/><span className="text-[#e17a25]">for every day.</span></h2><p className="mt-2 text-xs font-semibold text-emerald-950/70">Parbati Bhandar · Swasti Pally, Burdwan</p></div>
              <div className="relative z-10 mx-auto mt-5 grid max-w-[330px] grid-cols-3 gap-2">
                {marketItems.map((item,index) => <div key={item.label} className={`pb-market-item ${item.tone} flex min-h-[78px] flex-col items-center justify-center rounded-2xl border border-white/80 shadow-sm`} style={{animationDelay:`${index*90}ms`}}><span className="text-[32px] leading-none drop-shadow-sm">{item.icon}</span><span className="mt-1 text-[9px] font-extrabold text-slate-700">{item.label}</span></div>)}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/35 to-transparent"/>
            </div>
            <div className="bg-white px-5 pb-5 pt-4">
              <p className="text-center text-xs leading-relaxed text-slate-600">Shop everyday groceries from your local store. Browse live availability, choose your pack size and place your order in a few taps.</p>
              <button type="button" onClick={() => { closeWelcomePromo(); window.setTimeout(() => catalogSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#087a55] px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#066044] active:scale-[.98]">Start shopping <ChevronRight className="h-5 w-5"/></button>
            </div>
          </div>
        </div>;
      })()}

      {/* ===================================================================== */}
      {/* SPECIAL OCCASION BANNER + ADMIN "BEST ITEMS" HOVER / PEEK SHOWCASE    */}
      {/* ===================================================================== */}
      <section
        ref={bestItemsSectionRef}
        aria-label="Special Occasion and Best Items Showcase"
        className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 pt-3 pb-4 space-y-3"
      >
        {/* =================================================================== */}
        {/* MERGED HERO SLIDER BAR: FESTIVE BANNER + BEST 5 RANKED SPOTLIGHT    */}
        {/* Auto-slides & clickable; when Festive Banner is OFF, Best 5 slides  */}
        {/* =================================================================== */}
        {heroSlides.length > 0 && currentSlide && (
          <div
            onMouseEnter={() => setIsSliderHovered(true)}
            onMouseLeave={() => setIsSliderHovered(false)}
            className="space-y-3"
          >
            {/* Top Slider Header Bar: Shows Slide Counter, Rank Info & Auto-Slide Toggle */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xs shrink-0">
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {storeSettings.showOccasionBanner === true ? 'Festival Greeting + Best 5 Products • উৎসবের শুভেচ্ছা' : 'Best 5 Products Spotlight Slider • সেরা ৫ পছন্দের পণ্য'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                <button
                  type="button"
                  onClick={() => setIsAutoSlidePaused((prev) => !prev)}
                  aria-label={isAutoSlidePaused ? 'Resume automatic slider' : 'Pause automatic slider'}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                  title={isAutoSlidePaused ? 'Click to resume auto-sliding' : 'Auto-sliding active (click to pause)'}
                >
                  {isAutoSlidePaused ? (
                    <>
                      <Play className="w-2.5 h-2.5 fill-slate-700" />
                      <span>Paused</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-2.5 h-2.5 fill-slate-700" />
                      <span>Auto</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                  {safeSlideIndex + 1} / {heroSlides.length}
                </span>
              </div>
            </div>

            {/* Main Peek-Framed Slider Stage with Prev / Next Controls */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e3f5e7] via-white to-[#e6f6eb] p-1.5 sm:p-3 shadow-[0_14px_40px_rgba(5,90,48,0.12)]">
              {/* Left Peek Edge Card (Visual Framing like the mobile screenshot) */}
              <div
                aria-hidden="true"
                onClick={handlePrevSlide}
                className="hidden sm:block w-8 h-72 rounded-r-3xl bg-gradient-to-b from-amber-200 via-orange-200 to-amber-300 opacity-75 shrink-0 -ml-4 shadow-inner cursor-pointer hover:opacity-100 transition-opacity"
              />

              {/* Previous Slide Button */}
              {heroSlides.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Previous spotlight slide"
                  className="absolute left-1.5 sm:left-6 z-30 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 border border-slate-200 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* =============================================================== */}
              {/* SLIDE TYPE A: FESTIVE SEASON / SPECIAL OCCASION BANNER SLIDE    */}
              {/* =============================================================== */}
              {currentSlide.type === 'festive' ? (
                <div
                  onClick={() => {
                    setSelectedCategory('all');
                    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="pb-christmas-banner relative w-full max-w-md mx-auto min-h-[360px] rounded-[28px] overflow-hidden shadow-xl border border-emerald-200/50 cursor-pointer group select-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#073b2b] via-[#0b6848] to-[#092e27]"/>
                  <div className="pb-christmas-glow absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl"/>
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-300 to-emerald-300"/>
                  <div className="pb-christmas-garland absolute left-0 right-0 top-3 flex justify-around px-2 text-lg sm:text-xl" aria-hidden="true"><span>🔴</span><span>🟡</span><span>🟢</span><span>🔴</span><span>🟡</span><span>🟢</span><span>🔴</span><span>🟡</span></div>
                  <div className="relative z-10 flex min-h-[360px] flex-col items-center justify-center px-5 pb-6 pt-12 text-center">
                    <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.22em] text-emerald-100 backdrop-blur-sm">🎄 {currentSlide.tag}</span>
                    <div className="relative mt-3 flex h-28 w-full items-center justify-center gap-2 sm:h-32" aria-hidden="true">
                      <span className="pb-christmas-sway text-6xl drop-shadow-lg sm:text-7xl">🎄</span>
                      <span className="pb-christmas-gift text-4xl sm:text-5xl">🎁</span>
                      <span className="pb-christmas-sway text-5xl sm:text-6xl" style={{animationDelay:'-.8s'}}>🧸</span>
                      <span className="absolute left-[18%] top-1 text-xl">❄️</span><span className="absolute right-[17%] bottom-0 text-xl">✨</span>
                    </div>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[.25em] text-amber-200">Parbati Bhandar wishes you</p>
                    <h3 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white drop-shadow sm:text-4xl">{currentSlide.title}</h3>
                    <p className="mt-2 max-w-[290px] text-xs font-semibold leading-relaxed text-emerald-50/90 sm:text-sm">{currentSlide.subtitle}</p>
                    <button type="button" onClick={() => document.getElementById("christmas-special-products")?.scrollIntoView({behavior:"smooth",block:"start"})} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#facc15] px-5 py-2.5 text-xs font-black text-emerald-950 shadow-lg transition hover:-translate-y-0.5">Shop Christmas Specials <ChevronRight className="h-4 w-4"/></button>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 text-sm opacity-90" aria-hidden="true"><span>❄️</span><span>⭐</span><span>🎄</span><span>⭐</span><span>❄️</span></div>
                  </div>
                                </div>
              ) : (
                /* =============================================================== */
                /* SLIDE TYPE B: BEST PRODUCT SPOTLIGHT SLIDE (RANK #1 TO #5)      */
                /* =============================================================== */
                (() => {
                  const item = currentSlide.product;
                  const rankNum = currentSlide.rank;
                  const activeOpt = getActiveOptionForProduct(item);
                  const activeCartKey = makeCartKey(item.id, activeOpt.label);
                  const inCartQty =
                    cart[activeCartKey]?.qty ||
                    (activeOpt.label === item.unit ? cart[item.id]?.qty || 0 : 0);
                  const { hasDiscount, discountPercent, savedAmount } = calculateDiscountDetails(
                    activeOpt.price,
                    activeOpt.mrp
                  );
                  const hasVarieties = Boolean(item.varieties && item.varieties.length > 0);
                  const quickOptions = hasVarieties
                    ? (item.varieties || []).slice(0, 4).map((v) => ({
                        label: v.label,
                        price: Number(v.price),
                        mrp: v.mrp ? Number(v.mrp) : null,
                        inStock: v.inStock && item.inStock,
                      }))
                    : getWeightOptionsForProduct(item)
                        .filter((w) => ['250g', '500g', '1 kg', '2 kg'].includes(w.label))
                        .slice(0, 4)
                        .map((w) => ({
                          label: w.label,
                          price: w.price,
                          mrp: w.mrp,
                          inStock: item.inStock,
                        }));

                  return (
                    <div className="group relative w-full max-w-[760px] mx-auto h-[min(520px,70vh)] min-h-[390px] sm:min-h-[460px] lg:min-h-[500px] rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-xl border-2 border-emerald-200 bg-gradient-to-br from-[#f0fff4] via-white to-[#dcfce7] select-none animate-[fadeIn_550ms_ease-out]">
                      {/* Large product artwork, styled like a storefront campaign banner */}
                      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 pb-44 sm:pb-48 lg:pb-52">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain transition-transform duration-700 ease-out animate-[float_4s_ease-in-out_infinite] group-hover:scale-[1.07]"
                          />
                        ) : (
                          <span className="text-8xl sm:text-9xl drop-shadow-xs">{item.emoji || '🛍️'}</span>
                        )}
                      </div>

                      {/* Campaign badges */}
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/90 text-amber-300 font-black text-xs shadow-md tabular-nums">
                          <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
                          <span>#{rankNum} Best Pick</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.badge && <span className="px-3 py-1.5 rounded-full bg-emerald-700 text-white font-extrabold text-xs shadow-md">{item.badge}</span>}
                          {hasDiscount && <span className="px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">{discountPercent}% OFF</span>}
                        </div>
                      </div>

                      {/* Product details slide over the image on hover; remain visible on touch screens */}
                      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5 lg:p-7 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/0 text-white sm:translate-y-2 sm:opacity-95 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 transition-all duration-300">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">{item.category}</div>
                        <h3 className="text-xl sm:text-2xl font-black leading-tight mt-1 line-clamp-2">{item.name}</h3>

                        {quickOptions.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-bold text-white/80 mb-1.5">Select Pack / Weight</div>
                            <div className="flex flex-wrap items-center gap-2 tabular-nums">
                              {quickOptions.map((opt) => {
                                const isSelected = activeOpt.label === opt.label;
                                return (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setSelectedOptions((prev) => ({ ...prev, [item.id]: opt }))}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isSelected ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-white/15 hover:bg-white/25 text-white border-white/40'}`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-white/25 flex items-end justify-between gap-3 tabular-nums">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white/75">Pack: <strong className="text-white">{activeOpt.label}</strong></div>
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-2xl sm:text-3xl font-black text-white">₹{activeOpt.price}</span>
                              {hasDiscount && activeOpt.mrp && <span className="text-sm text-white/60 line-through font-semibold">₹{activeOpt.mrp}</span>}
                              {hasDiscount && savedAmount > 0 && <span className="text-xs font-extrabold text-emerald-300">Save ₹{savedAmount}</span>}
                            </div>
                          </div>

                          {inCartQty === 0 ? (
                            <button
                              type="button"
                              aria-label={`Add best item ${item.name}`}
                              onClick={() => updateCartQty(item, 1, { selectedUnit: activeOpt.label, unitPrice: activeOpt.price, unitMrp: activeOpt.mrp })}
                              className="px-4 py-3 rounded-2xl bg-[#ffd814] hover:bg-[#f7ca00] active:scale-95 text-slate-950 font-black text-sm flex items-center gap-1.5 shadow-lg cursor-pointer shrink-0"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              <span>Add to Order</span>
                            </button>
                          ) : (
                            <div className="flex items-center bg-emerald-600 text-white rounded-2xl overflow-hidden text-sm font-black shadow-lg shrink-0">
                              <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateCartQty(item, -1, { selectedUnit: activeOpt.label, unitPrice: activeOpt.price, unitMrp: activeOpt.mrp })} className="px-3 py-2.5 hover:bg-emerald-700 cursor-pointer">-</button>
                              <span className="px-2.5">{inCartQty}</span>
                              <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={getRemainingStock(item) <= 0} onClick={() => updateCartQty(item, 1, { selectedUnit: activeOpt.label, unitPrice: activeOpt.price, unitMrp: activeOpt.mrp })} className="px-3 py-2.5 hover:bg-emerald-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Next Slide Button */}
              {heroSlides.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Next spotlight slide"
                  className="absolute right-1.5 sm:right-6 z-30 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 border border-slate-200 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Right Peek Edge Card */}
              <div
                aria-hidden="true"
                onClick={handleNextSlide}
                className="hidden sm:block w-8 h-72 rounded-l-3xl bg-gradient-to-b from-sky-200 via-cyan-200 to-teal-300 opacity-75 shrink-0 -mr-4 shadow-inner cursor-pointer hover:opacity-100 transition-opacity"
              />
            </div>

            {/* Pagination Dots + Clickable Slide Strip (Festive + #1 to #5 Ordered Best Items) */}
            <div className="space-y-2 pt-0.5">
              {/* Dots */}
              <div className="flex items-center justify-center gap-1.5">
                {heroSlides.map((slide, dotIdx) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={
                      slide.type === 'festive'
                        ? `Slide ${dotIdx + 1}: Festive Banner`
                        : `Slide ${dotIdx + 1}: #${slide.rank} ${slide.product.name}`
                    }
                    onClick={() => setActiveSlideIndex(dotIdx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      safeSlideIndex === dotIdx
                        ? 'w-6 bg-slate-900'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              {/* Quick-Jump Numbered Slide Pills (Shows Festive + #1 First to #5 Last) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 tabular-nums">
                {heroSlides.map((slide, idx) => {
                  const isActive = safeSlideIndex === idx;
                  if (slide.type === 'festive') {
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-amber-50/80 hover:bg-amber-100 text-amber-950 border-amber-200'
                        }`}
                      >
                        <span>🪔</span>
                        <span>{slide.title}</span>
                      </button>
                    );
                  }

                  const shortName = slide.product.name.split('(')[0].trim();
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          isActive
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        #{slide.rank}
                      </span>
                      <span>{slide.product.emoji || '🛍️'}</span>
                      <span className="max-w-[115px] truncate">{shortName}</span>
                      <span
                        className={`text-[11px] font-extrabold ${
                          isActive ? 'text-amber-300' : 'text-emerald-700'
                        }`}
                      >
                        ₹{slide.product.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Deal Zone: owner picks or real catalogue discounts; no category shortcuts here */}
      {!isSearchSubmitted && !searchQuery && selectedCategory === 'all' && (() => {
        const curated = (storeSettings.dealProductIds || []).map(id => products.find(product => product.id === id)).filter((product): product is Product => Boolean(product && product.inStock));
        const discounted = products.filter(product => product.inStock && calculateDiscountDetails(product.price, product.mrp).hasDiscount);
        const dealProducts = storeSettings.dealsOfDayEnabled === true && curated.length ? curated : discounted;
        const featuredProducts = products.filter(product => product.inStock).sort((a,b) => {
          if (Boolean(a.isBestItem) !== Boolean(b.isBestItem)) return a.isBestItem ? -1 : 1;
          return Number(a.bestItemRank || 99) - Number(b.bestItemRank || 99);
        }).slice(0,8);
        const productCard = (product: Product, index: number) => {
          const discount = calculateDiscountDetails(product.price, product.mrp);
          const qty = Object.values(cart).find(item => item.product.id === product.id)?.qty || 0;
          return <article key={product.id} className="pb-deal-product-card w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:w-[176px]">
            <div className={`relative flex h-28 items-center justify-center overflow-hidden ${['bg-rose-50','bg-amber-50','bg-sky-50','bg-emerald-50'][index%4]}`}>
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 transition-transform duration-500 hover:scale-110"/> : <span className="text-5xl">{product.emoji || '🛍️'}</span>}
              <span className="absolute left-2 top-2 rounded-full bg-[#e91e63] px-2 py-1 text-[9px] font-black text-white">{discount.hasDiscount ? `${discount.discountPercent}% OFF` : 'SPECIAL PICK'}</span>
            </div>
            <div className="p-2.5"><h3 className="line-clamp-2 min-h-9 text-[11px] font-extrabold leading-4 text-slate-800">{product.name}</h3><p className="mt-1 text-[10px] text-slate-500">{product.unit}</p><div className="mt-1 flex items-baseline gap-1.5"><b className="text-sm text-slate-900">₹{product.price}</b>{discount.hasDiscount && <span className="text-[10px] text-slate-400 line-through">₹{product.mrp}</span>}</div><button type="button" disabled={!product.inStock} onClick={() => updateCartQty(product,1)} className="mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-xl bg-[#087a55] px-2 py-2 text-[11px] font-black text-white transition hover:bg-[#065d42] active:scale-[.97] disabled:opacity-50"><Plus className="h-3.5 w-3.5"/>{qty ? `Add more · ${qty}` : 'Quick add'}</button></div>
          </article>;
        };
        return <section aria-label="Deal Zone and featured products" className="mx-auto mb-5 w-full max-w-6xl overflow-hidden px-3.5 sm:px-6">
          <div className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#c8f5fb] via-[#e5f9ff] to-[#f7efff] px-3.5 pb-4 pt-5 shadow-sm sm:px-5 sm:pt-6">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#c5f3f8] via-[#d8f6ff] to-[#e9e1ff] px-4 py-5 sm:px-7 sm:py-7">
              <div aria-hidden="true" className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[22px] border-white/35"/>
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-800 sm:text-xs">Parbati Bhandar specials</p><h2 className="mt-1 text-3xl font-black leading-none tracking-tight text-[#075b78] sm:text-5xl">DEAL ZONE</h2><p className="mt-2 max-w-[230px] text-xs font-semibold text-sky-900/75 sm:text-sm">Real savings and handpicked grocery offers.</p></div>
                <div className="pb-deal-burst grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-white/70 bg-gradient-to-br from-amber-300 to-orange-400 text-4xl shadow-lg sm:h-28 sm:w-28 sm:text-6xl">🎁</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 px-1"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-800">Fresh offers</p><h3 className="text-lg font-black text-slate-900 sm:text-xl">{dealProducts.length ? 'Today’s Deals' : 'No active deals right now'}</h3></div>{dealProducts.length > 0 && <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold text-sky-900">{dealProducts.length} offers</span>}</div>
            {dealProducts.length > 0 ? <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">{dealProducts.slice(0,10).map(productCard)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-sky-200 bg-white/70 px-4 py-5 text-center text-xs font-semibold text-slate-600">New offers will appear here when products are discounted or selected in the owner portal.</p>}
            <div className="mt-5 border-t border-white/80 pt-4">
              <div className="mb-3 flex items-center gap-3"><h3 className="shrink-0 text-lg font-black text-slate-900">Featured</h3><div className="h-px flex-1 border-t border-dashed border-slate-300"/></div>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">{featuredProducts.slice(0,8).map(product => <button type="button" key={product.id} onClick={() => {setSearchQuery(product.name);setIsSearchSubmitted(true);setTimeout(() => catalogSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),60);}} className="w-[142px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:w-[165px]"><div className="flex h-28 items-center justify-center bg-slate-50 p-3">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain"/> : <span className="text-5xl">{product.emoji || '🛒'}</span>}</div><div className="p-2.5"><p className="line-clamp-2 min-h-9 text-[11px] font-extrabold text-slate-800">{product.name}</p><p className="mt-1 text-xs font-black text-emerald-800">₹{product.price} <span className="font-medium text-slate-400">/ {product.unit}</span></p></div></button>)}</div>
            </div>
          </div>
        </section>;
      })()}

      {!isSearchSubmitted && !searchQuery && selectedCategory === 'all' && (() => {
        const curated = (storeSettings.dealProductIds || []).map(id => products.find(product => product.id === id)).filter((product): product is Product => Boolean(product && product.inStock));
        const discounted = products.filter(product => product.inStock && Number(product.mrp) > Number(product.price));
        const dealProducts = storeSettings.dealsOfDayEnabled === true ? curated : discounted;
        const featuredProducts = products.filter(product => product.inStock).sort((a,b) => {
          if (Boolean(a.isBestItem) !== Boolean(b.isBestItem)) return a.isBestItem ? -1 : 1;
          return Number(a.bestItemRank || 99) - Number(b.bestItemRank || 99);
        }).slice(0,8);
        const categoryTiles = [
          {id:'Rice & Atta',title:'Rice & Atta',emoji:'🌾',tone:'from-amber-100 to-orange-50'},
          {id:'Dal & Pulses',title:'Dal & Pulses',emoji:'🥣',tone:'from-lime-100 to-emerald-50'},
          {id:'Tea & Biscuits',title:'Tea & Snacks',emoji:'🍪',tone:'from-rose-100 to-pink-50'},
          {id:'Daily Essentials',title:'Home Needs',emoji:'🧺',tone:'from-sky-100 to-cyan-50'}
        ];
        const productCard = (product: Product, index: number) => {
          const discount = calculateDiscountDetails(product.price, product.mrp);
          const qty = cart[makeCartKey(product.id, product.unit || '1 unit')]?.qty || cart[product.id]?.qty || 0;
          return <article key={product.id} className="pb-deal-product-card w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:w-[176px]">
            <div className={`relative flex h-28 items-center justify-center overflow-hidden ${['bg-rose-50','bg-amber-50','bg-sky-50','bg-emerald-50'][index%4]}`}>
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 transition-transform duration-500 hover:scale-110"/> : <span className="text-5xl">{product.emoji || '🛍️'}</span>}
              {discount.hasDiscount && <span className="absolute left-2 top-2 rounded-full bg-[#e91e63] px-2 py-1 text-[9px] font-black text-white">{discount.discountPercent}% OFF</span>}
            </div>
            <div className="p-2.5"><h3 className="line-clamp-2 min-h-9 text-[11px] font-extrabold leading-4 text-slate-800">{product.name}</h3><p className="mt-1 text-[10px] text-slate-500">{product.unit}</p><div className="mt-1 flex items-baseline gap-1.5"><b className="text-sm text-slate-900">₹{product.price}</b>{discount.hasDiscount && <span className="text-[10px] text-slate-400 line-through">₹{product.mrp}</span>}</div><button type="button" disabled={!product.inStock} onClick={() => updateCartQty(product,1)} className="mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-xl bg-[#087a55] px-2 py-2 text-[11px] font-black text-white transition hover:bg-[#065d42] active:scale-[.97] disabled:opacity-50"><Plus className="h-3.5 w-3.5"/>{qty ? `Add more · ${qty}` : 'Quick add'}</button></div>
          </article>;
        };
        return <section aria-label="Deal Zone and featured products" className="mx-auto mb-5 w-full max-w-6xl overflow-hidden sm:px-6">
          <div className="overflow-hidden rounded-none bg-[#c8f5fb] px-3.5 pb-4 pt-5 sm:rounded-[26px] sm:px-5 sm:pt-6">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#b9f1fa] via-[#c9f7fb] to-[#e3f9ff] px-4 py-5 sm:px-7 sm:py-7">
              <div aria-hidden="true" className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[22px] border-white/25"/>
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-800 sm:text-xs">Parbati Bhandar specials</p><h2 className="mt-1 text-3xl font-black leading-none tracking-tight text-[#075b78] sm:text-5xl">DEAL ZONE</h2><p className="mt-2 max-w-[230px] text-xs font-semibold text-sky-900/75 sm:text-sm">Little savings on the things your home needs every day.</p></div>
                <div className="pb-deal-burst grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-white/70 bg-gradient-to-br from-amber-300 to-orange-400 text-4xl shadow-lg sm:h-28 sm:w-28 sm:text-6xl">🛍️</div>
              </div>
              <div className="relative z-10 mt-4 grid grid-cols-4 gap-2 sm:mt-6 sm:gap-3">
                {categoryTiles.map(tile => {
                  const sample = products.find(product => product.category === tile.id && product.imageUrl);
                  return <button type="button" key={tile.id} onClick={() => {setSelectedCategory(tile.id);setIsSearchSubmitted(false);setSearchQuery('');setTimeout(() => catalogSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),60);}} className={`pb-deal-category flex min-w-0 flex-col items-center justify-between rounded-2xl border border-white/80 bg-gradient-to-b ${tile.tone} p-2 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:p-3`}>
                    <div className="grid h-12 w-full place-items-center sm:h-16">{sample ? <img src={sample.imageUrl} alt="" loading="lazy" className="h-full max-w-full object-contain"/> : <span className="text-3xl sm:text-4xl">{tile.emoji}</span>}</div><span className="mt-1 line-clamp-2 text-[9px] font-black leading-tight text-slate-800 sm:text-xs">{tile.title}</span>
                  </button>;
                })}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 px-1"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-800">Handpicked for you</p><h3 className="text-lg font-black text-slate-900 sm:text-xl">{dealProducts.length ? 'Today’s Deals' : 'Featured groceries'}</h3></div><span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold text-sky-900">{dealProducts.length ? `${dealProducts.length} offers` : 'Popular picks'}</span></div>
            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              {(dealProducts.length ? dealProducts : featuredProducts).slice(0,10).map(productCard)}
              {!dealProducts.length && !featuredProducts.length && <p className="w-full rounded-xl bg-white/70 p-5 text-center text-xs font-semibold text-slate-600">New offers and featured products will appear here.</p>}
            </div>
            {dealProducts.length > 0 && <p className="px-1 pt-1 text-[10px] font-medium text-sky-900/70">Offer prices are based on the live product catalogue. Availability may change.</p>}
          </div>
          <div className="mt-5 px-3.5 sm:px-0">
            <div className="mb-3 flex items-center gap-3"><h3 className="shrink-0 text-lg font-black text-slate-900">Featured</h3><div className="h-px flex-1 border-t border-dashed border-slate-300"/></div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              {featuredProducts.slice(0,8).map(product => <button type="button" key={product.id} onClick={() => {setSearchQuery(product.name);setIsSearchSubmitted(true);setTimeout(() => catalogSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),60);}} className="w-[142px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:w-[165px]"><div className="flex h-28 items-center justify-center bg-slate-50 p-3">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain"/> : <span className="text-5xl">{product.emoji || '🛒'}</span>}</div><div className="p-2.5"><p className="line-clamp-2 min-h-9 text-[11px] font-extrabold text-slate-800">{product.name}</p><p className="mt-1 text-xs font-black text-emerald-800">₹{product.price} <span className="font-medium text-slate-400">/ {product.unit}</span></p></div></button>)}
            </div>
          </div>
        </section>;
      })()}

      {!isSearchSubmitted && !searchQuery && selectedCategory === 'all' && (() => {
        const available = products.filter(product => product.inStock !== false);
        const shuffled = [...available];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const picks = shuffled.slice(0, 10);
        return picks.length ? <section aria-label="Popular groceries" className="mx-auto w-full max-w-6xl px-3.5 pb-4 sm:px-6">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Picked for your home</p><h2 className="mt-1 text-lg font-black text-slate-900">Popular groceries</h2><p className="text-xs text-slate-500">Quickly add everyday favourites to your order</p></div><button type="button" onClick={() => catalogSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'})} className="shrink-0 text-xs font-extrabold text-emerald-800">View all <ArrowRight className="ml-1 inline h-3.5 w-3.5"/></button></div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {picks.map(product => {
              const quantity = cart[makeCartKey(product.id, product.unit)]?.qty || 0;
              return <article key={product.id} className="w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm sm:w-[176px]">
                <button type="button" onClick={() => {setSearchQuery(product.name);setIsSearchSubmitted(true);setSelectedCategory('all');setTimeout(() => catalogSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),50);}} className="flex w-full flex-col items-center p-3 text-left">
                  <div className="flex h-24 w-full items-center justify-center rounded-xl bg-emerald-50/70 p-2">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain"/> : <span className="text-4xl">{product.emoji || '🛒'}</span>}</div>
                  <p className="mt-2 line-clamp-2 min-h-9 w-full text-xs font-extrabold leading-4 text-slate-800">{product.name}</p>
                  <p className="mt-1 w-full text-sm font-black text-slate-900">₹{product.price}<span className="ml-1 text-[10px] font-medium text-slate-500">/ {product.unit}</span></p>
                </button>
                <button type="button" disabled={product.inStock === false} onClick={() => updateCartQty(product,1,{selectedUnit:product.unit,unitPrice:product.price,unitMrp:product.mrp ?? null})} className="m-2 mt-0 flex w-[calc(100%-1rem)] items-center justify-center gap-1 rounded-xl bg-[#ffd814] py-2 text-xs font-black text-slate-900 disabled:opacity-50"><Plus className="h-3.5 w-3.5"/>{quantity ? `Add more · ${quantity}` : 'Quick add'}</button>
              </article>;
            })}
          </div>
        </section> : null;
      })()}

      {/* ===================================================================== */}
      {!isSearchSubmitted && !searchQuery && (() => {
        const christmasProducts=(storeSettings.christmasSpecialProductIds || []).map(id=>products.find(p=>p.id===id)).filter((p): p is Product => Boolean(p && p.inStock));
        if(!christmasProducts.length) return null;
        return <section id="christmas-special-products" className="scroll-mt-24 mx-auto mb-7 w-full max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-emerald-50 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-700">Seasonal picks</p><h2 className="text-xl font-black text-emerald-950 sm:text-2xl">🎄 Christmas Specials</h2><p className="mt-1 text-xs text-slate-600">Festive picks selected by Parbati Bhandar</p></div><span className="text-3xl">🎁</span></div>
            <div className="flex gap-3 overflow-x-auto pb-2">{christmasProducts.map(product => {const qty=Object.values(cart).find(item=>item.product.id===product.id)?.qty||0;return <article key={product.id} className="w-36 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-sm sm:w-44"><div className="flex h-28 items-center justify-center bg-gradient-to-br from-red-50 to-emerald-50">{product.imageUrl?<img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain"/>:<span className="text-4xl">{product.emoji}</span>}</div><div className="p-3"><p className="line-clamp-2 min-h-9 text-xs font-extrabold text-slate-900">{product.name}</p><p className="mt-1 text-sm font-black text-emerald-800">₹{product.price}<span className="text-[10px] font-medium text-slate-500"> / {product.unit}</span></p><button type="button" onClick={()=>updateCartQty(product,1) className="mt-2 w-full rounded-lg bg-emerald-700 px-2 py-2 text-xs font-bold text-white hover:bg-emerald-800">{qty>0?`Added · ${qty}`:'Add'}</button></div></article>})}</div>
          </div>
        </section>;
      })()}
      {/* MAIN GROCERY CATALOG GRID                                             */}
      {/* ===================================================================== */}
      <main
        ref={catalogSectionRef}
        className="max-w-6xl mx-auto px-3.5 sm:px-6 py-5 flex-1 w-full"
      >
        {/* Filter Bar: In Stock Only + Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>
                {selectedCategory === 'all' ? 'All Store Products' : selectedCategory}
              </span>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                · {filteredCustomerProducts.length} items
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Select pack varieties (e.g. 1 kg / 5 kg) or custom weights (200g, 500g, 2 kg) on any card
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                inStockOnly
                  ? 'bg-[#0d647d] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>In Stock Only</span>
            </button>

            <div className="relative">
              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl px-3 py-1.5 pr-7 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="recent">Sort: Recent</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name">Name: A → Z</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-slate-600 font-medium">Loading fresh store catalog...</p>
          </div>
        ) : filteredCustomerProducts.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-200 max-w-md mx-auto my-6">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto text-3xl mb-3 shadow-2xs">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching products found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing your search filter or switching to &ldquo;All Items&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchSubmitted(false);
                setSelectedCategory('all');
                setInStockOnly(false);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0d647d] text-white text-xs font-bold hover:bg-sky-900 cursor-pointer"
            >
              Show All Store Items
            </button>
          </div>
        ) : (
          <div className="pb-product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredCustomerProducts.map((product) => {
              const activeOpt = getActiveOptionForProduct(product);
              const activeCartKey = makeCartKey(product.id, activeOpt.label);
              const inCartQty =
                cart[activeCartKey]?.qty ||
                (activeOpt.label === product.unit ? cart[product.id]?.qty || 0 : 0);
              const canAddMore = activeOpt.inStock && product.inStock;

              const { hasDiscount, discountPercent, savedAmount } = calculateDiscountDetails(
                activeOpt.price,
                activeOpt.mrp
              );

              const hasVarieties = Boolean(product.varieties && product.varieties.length > 0);
              const weightOptions = getWeightOptionsForProduct(product);
              const hasWeightSelector = !hasVarieties && weightOptions.length > 0;
              const isCustomOpen = Boolean(customWeightOpen[product.id]);

              return (
                <div
                  key={product.id}
                  className={`pb-product-card group bg-white rounded-xl sm:rounded-2xl border border-emerald-100 shadow-[0_2px_10px_rgba(16,80,45,0.05)] transition-all flex flex-col justify-between overflow-hidden min-w-0 hover:shadow-lg hover:-translate-y-0.5 ${
                    product.inStock
                      ? 'border-emerald-100 hover:border-emerald-400 hover:shadow-md'
                      : 'border-slate-200 opacity-70 bg-slate-50'
                  }`}
                >
                  <div>
                    {/* Product Visual Box */}
                    <div className="pb-product-image relative aspect-square w-full max-h-44 bg-gradient-to-br from-[#f6fbf5] to-[#edf6ec] flex items-center justify-center p-2.5 sm:p-4 border-b border-emerald-50">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <span className="text-6xl select-none filter drop-shadow-xs group-hover:scale-110 transition-transform duration-200">
                          {product.emoji || '🛍️'}
                        </span>
                      )}

                      {/* Top-Left Automatic Discount & Custom Tag Badges */}
                      <div className="absolute top-2.5 left-2.5 right-20 flex flex-col gap-1 items-start min-w-0">
                        {hasDiscount && activeOpt.inStock && (
                          <span className="max-w-full px-2 py-1 rounded-md bg-amber-400 text-slate-950 font-extrabold text-[10px] leading-tight uppercase tracking-wider shadow-2xs tabular-nums whitespace-normal break-words">
                            {discountPercent}% OFF · Save ₹{savedAmount}
                          </span>
                        )}
                        {product.badge && (
                          <span className="max-w-full px-2 py-1 rounded-md bg-[#0d647d] text-white font-semibold text-[10px] leading-tight shadow-2xs whitespace-normal break-words">
                            {product.badge}
                          </span>
                        )}
                        {product.inStock && (product as any).lowStock === true && (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-orange-300 bg-gradient-to-r from-orange-100 to-amber-100 px-2 py-1 text-[9px] font-black leading-tight tracking-wide text-orange-900 shadow-sm animate-pulse motion-reduce:animate-none">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-600" />
                            LOW STOCK · ORDER SOON
                          </span>
                        )}
                      </div>

                      {/* Top-Right Availability Badge — reserved space keeps it clear of offer labels */}
                      <div className="absolute top-2.5 right-2.5 max-w-[4.5rem]">
                        {canAddMore ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            {inCartQty > 0 ? 'In your cart' : 'Unavailable'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="pb-product-info p-2.5 sm:p-3.5 space-y-2 sm:space-y-2.5">
                      <div>
                        <div className="text-[9px] sm:text-[11px] font-semibold text-[#0d647d] uppercase tracking-wider truncate">
                          {product.category}
                        </div>
                        <h3 className="pb-product-name font-bold text-slate-900 text-xs sm:text-base line-clamp-2 mt-0.5 min-h-[2.25rem] sm:min-h-[2.5rem]">
                          {product.name}
                        </h3>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                          </span>
                        </div>
                      </div>

                      {/* 1. Product Varieties Selector (e.g. Aashirvaad Atta 5 kg & 1 kg) */}
                      {hasVarieties && product.varieties && (
                        <div className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Choose Pack Size / Variety:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {product.varieties.map((v) => {
                              const isSelected = activeOpt.label === v.label;
                              return (
                                <button
                                  type="button"
                                  key={v.id}
                                  aria-label={`Select ${v.label} for ${product.name}`}
                                  onClick={() =>
                                    setSelectedOptions((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        label: v.label,
                                        price: Number(v.price),
                                        mrp: v.mrp ? Number(v.mrp) : null,
                                        inStock: v.inStock && product.inStock,
                                      },
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                                    isSelected
                                      ? 'bg-[#0d647d] text-white shadow-2xs'
                                      : v.inStock
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      : 'bg-slate-100 text-slate-400 line-through'
                                  }`}
                                >
                                  {v.label} · ₹{v.price}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Flexible Weight Selector (100g, 200g, 250g, 500g, 1 kg, 2 kg + Custom) */}
                      {hasWeightSelector && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Scale className="w-3 h-3 text-[#0d647d]" />
                              Select Weight / Qty:
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomWeightOpen((prev) => ({
                                  ...prev,
                                  [product.id]: !prev[product.id],
                                }))
                              }
                              className="text-[11px] font-bold text-[#0d647d] hover:underline cursor-pointer"
                            >
                              {isCustomOpen ? 'Close Custom' : '+ Custom Weight'}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {weightOptions.map((wOpt) => {
                              const isSelected = activeOpt.label === wOpt.label;
                              return (
                                <button
                                  type="button"
                                  key={wOpt.label}
                                  aria-label={`Select ${wOpt.label} of ${product.name}`}
                                  onClick={() =>
                                    setSelectedOptions((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        label: wOpt.label,
                                        price: wOpt.price,
                                        mrp: wOpt.mrp,
                                        inStock: product.inStock,
                                      },
                                    }))
                                  }
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer tabular-nums ${
                                    isSelected
                                      ? 'bg-[#0d647d] text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {wOpt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom Weight Input Box */}
                          {isCustomOpen && (
                            <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-200 flex items-center gap-1.5">
                              <input
                                type="number"
                                step="any"
                                min="1"
                                aria-label={`Custom weight amount for ${product.name}`}
                                value={customWeightAmount[product.id] || ''}
                                onChange={(e) =>
                                  setCustomWeightAmount((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }))
                                }
                                placeholder="e.g. 300"
                                className="w-20 px-2 py-1 rounded-lg border border-sky-300 bg-white text-xs font-bold text-slate-900 focus:outline-none tabular-nums"
                              />
                              <select
                                aria-label={`Custom weight unit for ${product.name}`}
                                value={customWeightUnit[product.id] || 'g'}
                                onChange={(e) =>
                                  setCustomWeightUnit((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value as 'g' | 'kg' | 'ml' | 'L',
                                  }))
                                }
                                className="px-1.5 py-1 rounded-lg border border-sky-300 bg-white text-xs font-bold text-slate-800"
                              >
                                <option value="g">gm (g)</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="L">Litre</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleApplyCustomWeight(product)}
                                className="px-2.5 py-1 rounded-lg bg-[#0d647d] text-white text-xs font-bold hover:bg-sky-900 cursor-pointer ml-auto"
                              >
                                Set
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price, Auto Discount Summary & Add to List Footer */}
                  <div className="px-2.5 sm:px-3.5 pb-3 sm:pb-3.5 pt-2 flex items-end justify-between gap-1.5 sm:gap-2 border-t border-slate-100/80">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                        <span>Selected:</span>
                        <span className="font-bold text-slate-800">{activeOpt.label}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 tabular-nums mt-0.5">
                        <span className="text-base sm:text-xl font-extrabold text-slate-900">
                          ₹{activeOpt.price}
                        </span>
                        {hasDiscount && activeOpt.mrp && (
                          <span className="text-xs text-slate-400 line-through font-medium">
                            ₹{activeOpt.mrp}
                          </span>
                        )}
                      </div>
                      {hasDiscount && (
                        <div className="text-[11px] font-bold text-emerald-700 tabular-nums">
                          Save ₹{savedAmount} ({discountPercent}% OFF)
                        </div>
                      )}
                    </div>

                    {/* Add to Customer Order List */}
                    {(canAddMore || inCartQty > 0) ? (
                      inCartQty === 0 ? (
                        <button
                          type="button"
                          aria-label={`Add ${product.name} to order list`}
                          onClick={() =>
                            updateCartQty(product, 1, {
                              selectedUnit: activeOpt.label,
                              unitPrice: activeOpt.price,
                              unitMrp: activeOpt.mrp,
                            })
                          }
                          className="px-2.5 sm:px-4 py-2 rounded-lg border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-xs sm:text-sm flex items-center gap-1 shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center bg-emerald-600 text-white rounded-xl overflow-hidden shadow-xs shrink-0">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.name}`}
                            onClick={() =>
                              updateCartQty(product, -1, {
                                selectedUnit: activeOpt.label,
                                unitPrice: activeOpt.price,
                                unitMrp: activeOpt.mrp,
                              })
                            }
                            className="p-2 hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-extrabold tabular-nums">
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.name}`}
                            disabled={!canAddMore || getRemainingStock(product) <= 0}
                            onClick={() =>
                              updateCartQty(product, 1, {
                                selectedUnit: activeOpt.label,
                                unitPrice: activeOpt.price,
                                unitMrp: activeOpt.mrp,
                              })
                            }
                            className="p-2 hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic py-1">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* STOREFRONT FOOTER (Clean Customer Footer — NO Owner Login Button!)    */}
      {/* ===================================================================== */}

<footer className="bg-slate-50 border-t border-slate-200 mt-10 py-6 px-4 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-extrabold text-slate-900 text-sm">
              <Store className="w-4 h-4 text-[#0d647d]" />
              <span>{storeSettings.storeName}</span>
            </div>
            <p className="text-xs text-slate-500">
              {storeSettings.address} • Phone: {storeSettings.phone}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a
              href={'https://maps.app.goo.gl/yrXRW4uuwWjaEzQi6?g_st=ac'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <MapPin className="w-4 h-4 text-[#0d647d]" />
              <span>Find on Google Maps</span>
            </a>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <QrCode className="w-4 h-4 text-[#0d647d]" />
              <span>Store QR Code</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* STICKY BOTTOM CART BAR (Product Thumbnails + Total + Yellow Proceed)  */}
      {/* ===================================================================== */}
      <div
        aria-label="Sticky Shopping Cart Bar"
        className="pb-mobile-bottom-cart fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.1)]"
      >
        <div className="max-w-3xl mx-auto">
          {/* Product Thumbnails + Total & Saved + Yellow "Proceed" Pill Button */}
          <div className="px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-3 tabular-nums">
            <button
              type="button"
              onClick={() => onNavigate('/cart')}
              aria-label="Review items in order list"
              className="flex items-center gap-3 text-left cursor-pointer group min-w-0"
            >
              {/* Overlapping Circular Item Thumbnails */}
              <div className="flex items-center -space-x-2.5 shrink-0">
                {cartItemsList.length > 0 ? (
                  cartItemsList.slice(0, 3).map((entry) => (
                    <div
                      key={entry.cartKey}
                      className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-xs flex items-center justify-center text-lg overflow-hidden"
                    >
                      {entry.product.imageUrl ? (
                        <img
                          src={entry.product.imageUrl}
                          alt={entry.product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{entry.product.emoji || '🛍️'}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-xs flex items-center justify-center text-slate-600">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Price + Saved + Item Count ^ */}
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-base sm:text-lg font-black text-slate-950">
                    ₹{cartTotalPrice}
                  </span>
                  {cartTotalSaved > 0 && (
                    <span className="text-xs font-extrabold text-emerald-700">
                      ₹{cartTotalSaved} saved
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-1 group-hover:text-slate-800">
                  <span>
                    {cartTotalItems} {cartTotalItems === 1 ? 'item' : 'items'}
                  </span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>

            {/* Bright Yellow Pill "Proceed" Button (Matches Screenshot) */}
            <button
              type="button"
              onClick={() => onNavigate('/cart')}
              aria-label="Proceed to Order List"
              className="px-7 sm:px-9 py-3 rounded-full bg-[#ffd814] hover:bg-[#f7ca00] active:scale-98 text-slate-950 font-black text-sm sm:text-base shadow-sm transition-all cursor-pointer shrink-0"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
