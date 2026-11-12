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
  getWeightOptionsForProduct,
  calculateCustomWeightOption,
  makeCartKey,
  buildHeroSlides,
} from '../utils/storeLogic';

interface CustomerStorefrontProps {
  storeSettings: StoreSettings;
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
  setIsCartOpen: (open: boolean) => void;
  setIsQrModalOpen: (open: boolean) => void;
  onSecretOwnerAccess: () => void;
}

export function CustomerStorefront({
  storeSettings,
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
  setIsCartOpen,
  setIsQrModalOpen,
  onSecretOwnerAccess,
}: CustomerStorefrontProps) {
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

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
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

  return (
    <div className="flex-1 flex flex-col bg-white text-slate-900 pb-24">
      {/* ===================================================================== */}
      {/* TOP MOBILE-FIRST APP BAR WITH SHOP NAME                               */}
      {/* ===================================================================== */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 pt-3 pb-2">
          {/* Row 1: Profile | Shop Name (5-tap secret owner access) | Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: User / Store Info Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                aria-label="Store info and customer greeting"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-800 cursor-pointer shrink-0"
              >
                <User className="w-4 h-4 fill-slate-800" />
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
                <span className="text-base sm:text-xl font-black tracking-tight text-slate-950 leading-tight">
                  {(storeSettings.storeName || 'Parbati Bhandar (পার্বতী ভান্ডার)')
                    .replace(/\s*\(.*\)\s*$/, '')}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-[#0d647d] leading-tight">
                {(storeSettings.storeName || 'Parbati Bhandar (পার্বতী ভান্ডার)').match(
                  /\((.*)\)/
                )?.[1] || 'পার্বতী ভান্ডার'}
              </span>
              <span className="block h-0.5 bg-amber-400 rounded-full w-20 sm:w-28 mt-0.5" />
            </button>

            {/* Right: Call, WhatsApp & QR Code Quick Buttons */}
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${(storeSettings.phone || '+919734765207').replace(/\s+/g, '')}`}
                aria-label="Call Store"
                className="w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors"
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
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xs transition-colors"
                title="WhatsApp Parbati Bhandar"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                aria-label="Shop QR Poster"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Show Store QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: "10 mins" Teal Badge + Customer / Burdwan Location Line */}
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-12 h-11 rounded-xl bg-[#0d647d] text-white flex flex-col items-center justify-center leading-none shrink-0 shadow-2xs tabular-nums">
              <span className="text-sm sm:text-base font-black">{deliveryEtaMins}</span>
              <span className="text-[10px] font-semibold opacity-95">mins</span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddressExpanded(!isAddressExpanded)}
              className="flex-1 min-w-0 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-extrabold text-xs tracking-tight">
                  Swasti Pally - BURDWAN
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    liveIsOpen
                      ? 'bg-emerald-100 text-emerald-800'
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
                <p className="text-xs sm:text-sm text-slate-700 font-medium truncate">
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
                  <span>5.0 Rated • {inStockCount} Items Live</span>
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

      {/* ===================================================================== */}
      {/* STICKY SEARCH BAR & CATEGORY RIBBON (Follows User on Scroll)          */}
      {/* ===================================================================== */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            {/* Rounded Pill Search Bar (like "Search for 'Coffee'" in screenshot) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search store products"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder='Search for "Miniket Rice", "Atta", "Mustard Oil", "Ghee"...'
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium border border-slate-300 shadow-2xs focus:outline-none focus:border-[#0d647d] focus:ring-2 focus:ring-sky-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Compact My Order Button in Sticky Header */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
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

      {/* ===================================================================== */}
      {/* "NOMOSHKAR GRAHOK" BURDWAN HERITAGE GREETING BANNER                   */}
      {/* Matches the Curzon Gate + "Nomoshkar Burdwan" section in screenshot   */}
      {/* ===================================================================== */}
      <section
        aria-label="Nomoshkar Grahok Welcome Banner"
        className="relative bg-white pt-3 pb-2 overflow-hidden"
      >
        <div className="max-w-xl mx-auto px-4 relative">
          <div className="flex items-end justify-between px-4 sm:px-10">
            {/* Left: Architectural Illustration of Burdwan Curzon Gate (কার্জন গেট) */}
            <div className="relative z-10 -mb-1.5">
              <svg
                viewBox="0 0 140 88"
                className="w-28 sm:w-32 h-20 text-slate-700"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Top Finials & Pediment of Curzon Gate */}
                <path
                  d="M42 22 L98 22 L94 14 L70 8 L46 14 Z"
                  fill="#cbd5e1"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                <circle cx="70" cy="6" r="2.5" fill="#334155" />
                <circle cx="48" cy="11" r="2" fill="#334155" />
                <circle cx="92" cy="11" r="2" fill="#334155" />
                {/* Side Towers */}
                <rect
                  x="26"
                  y="24"
                  width="18"
                  height="60"
                  fill="#e2e8f0"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                <rect
                  x="96"
                  y="24"
                  width="18"
                  height="60"
                  fill="#e2e8f0"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                {/* Main Central Archway */}
                <path
                  d="M44 22 H96 V84 H84 V52 C84 42 56 42 56 52 V84 H44 V22 Z"
                  fill="#f1f5f9"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                {/* Inner Arch Ring Details */}
                <path
                  d="M52 84 V51 C52 37 88 37 88 51 V84"
                  stroke="#475569"
                  strokeWidth="1.4"
                  strokeDasharray="2 2"
                />
                {/* Side Small Arches */}
                <path
                  d="M31 84 V60 C31 55 39 55 39 60 V84"
                  fill="#94a3b8"
                  stroke="#334155"
                  strokeWidth="1.4"
                />
                <path
                  d="M101 84 V60 C101 55 109 55 109 60 V84"
                  fill="#94a3b8"
                  stroke="#334155"
                  strokeWidth="1.4"
                />
                {/* Horizontal Cornice Lines */}
                <line x1="23" y1="24" x2="117" y2="24" stroke="#1e293b" strokeWidth="2.2" />
                <line x1="25" y1="34" x2="115" y2="34" stroke="#475569" strokeWidth="1.4" />
              </svg>
            </div>

            {/* Right: "Nomoshkar Grahok" Typography */}
            <div className="text-center sm:text-right pb-1 z-10">
              <div className="font-serif text-sm sm:text-base text-slate-600 tracking-wide">
                {greetingTop}
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-extrabold text-[#14233c] tracking-tight leading-none mt-0.5">
                {greetingMain}
              </div>
              {storeSettings.greetingBengali && (
                <div className="text-[11px] font-semibold text-emerald-800 mt-1">
                  {storeSettings.greetingBengali}
                </div>
              )}
            </div>
          </div>

          {/* Sweeping Curved Horizon Line under Curzon Gate & Nomoshkar Grahok */}
          <svg
            viewBox="0 0 600 24"
            className="w-full h-4 text-[#1e293b] -mt-1"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 20 Q160 2 310 14 T600 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SPECIAL OCCASION BANNER + ADMIN "BEST ITEMS" HOVER / PEEK SHOWCASE    */}
      {/* ===================================================================== */}
      <section
        ref={bestItemsSectionRef}
        aria-label="Special Occasion and Best Items Showcase"
        className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 pt-2 pb-4 space-y-3"
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
                    {storeSettings.showOccasionBanner !== false
                      ? 'Festive & Best 5 Spotlight Slider • উৎসব ও সেরা ৫ পণ্য'
                      : 'Best 5 Products Spotlight Slider • সেরা ৫ পছন্দের পণ্য'}
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
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 overflow-hidden">
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
                  className="relative w-full max-w-md mx-auto rounded-[28px] overflow-hidden shadow-md border border-amber-200/80 cursor-pointer group select-none bg-gradient-to-b from-[#fce3ba] via-[#f7b977] to-[#df8944]"
                >
                  {/* Top Marigold Garland Decoration */}
                  <div className="absolute top-0 inset-x-0 flex justify-between pointer-events-none z-20 px-2">
                    <div className="flex items-start gap-0.5 text-lg sm:text-xl drop-shadow-xs">
                      <span>🌼</span>
                      <span>🟠</span>
                      <span>🌼</span>
                      <span>🌿</span>
                    </div>
                    <div className="flex items-start gap-0.5 text-lg sm:text-xl drop-shadow-xs">
                      <span>🌿</span>
                      <span>🌼</span>
                      <span>🟠</span>
                      <span>🌼</span>
                    </div>
                  </div>

                  {/* Occasion Header Typography */}
                  <div className="relative z-10 pt-6 pb-3 px-5 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/85 text-[#0c4a3e] font-extrabold text-[10px] uppercase tracking-wider shadow-2xs mb-1">
                      🪔 {currentSlide.tag}
                    </span>
                    <h3 className="font-serif text-3xl sm:text-4xl font-black text-[#093832] tracking-tight drop-shadow-2xs">
                      {currentSlide.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-[#2d1e12] mt-0.5">
                      {currentSlide.subtitle}
                    </p>
                  </div>

                  {/* Occasion Visual Artwork / Uploaded Picture */}
                  <div className="relative h-56 sm:h-64 w-full flex items-end justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8c173]/50 to-[#946b45]/80 pointer-events-none" />
                    <div className="w-14 h-14 rounded-full bg-[#fff7c2] shadow-[0_0_40px_14px_rgba(255,240,150,0.85)] absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none" />

                    {currentSlide.imageUrl ? (
                      <img
                        src={currentSlide.imageUrl}
                        alt={currentSlide.title}
                        referrerPolicy="no-referrer"
                        className={`relative z-10 w-full h-full object-cover transition-transform duration-300 ${
                          currentSlide.imageUrl.includes('photo_2026-11-12_10-31-46_ee14c399.jpg')
                            ? 'object-[50%_50%] scale-[1.45] group-hover:scale-[1.5]'
                            : 'object-center group-hover:scale-105'
                        }`}
                      />
                    ) : (
                      <div className="relative z-10 flex flex-col items-center justify-center pb-8 text-center px-4">
                        <div className="text-6xl sm:text-7xl drop-shadow-md">🙏🧺🍌🥥🪔</div>
                        <p className="mt-2 text-xs font-bold text-white bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-xs">
                          Fresh Puja Ghee, Gobindobhog Rice, Fruits &amp; Spices Available
                        </p>
                      </div>
                    )}

                    {/* Bottom Glowing Diyas (প্রদীপ) */}
                    <div className="absolute bottom-2.5 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
                      <span className="text-xl sm:text-2xl drop-shadow">🪔🌼🪔</span>
                      <span className="px-3.5 py-1 rounded-full bg-white/95 text-slate-900 font-extrabold text-[11px] shadow-sm group-hover:bg-amber-300 transition-colors">
                        Shop Festival Items →
                      </span>
                      <span className="text-xl sm:text-2xl drop-shadow">🪔🌼🪔</span>
                    </div>
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
                    <div className="relative w-full max-w-md mx-auto rounded-[28px] overflow-hidden shadow-md border-2 border-amber-300/90 bg-gradient-to-br from-[#fffbeb] via-white to-[#ecfdf5] p-4 sm:p-5 select-none">
                      {/* Top Row: Rank Badge (#1 - #5) + Automatic Discount Pill */}
                      <div className="flex items-center justify-between gap-1.5 mb-3">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-amber-300 font-black text-[11px] shadow-2xs tabular-nums whitespace-nowrap shrink-0">
                          <Sparkles className="w-3 h-3 fill-amber-300 shrink-0" />
                          <span>#{rankNum} Best Pick</span>
                          <span className="hidden xs:inline text-amber-200/80 font-semibold text-[10px]">
                            • সেরা #{rankNum}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white font-extrabold text-[10px] shadow-2xs whitespace-nowrap">
                              {item.badge}
                            </span>
                          )}
                          {hasDiscount && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-2xs tabular-nums whitespace-nowrap">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Content: Product Artwork + Title + Pack Selector */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 my-1 px-7 sm:px-2">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <span className="text-5xl sm:text-6xl drop-shadow-xs">
                              {item.emoji || '🛍️'}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-center sm:text-left">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                            {item.category}
                          </div>
                          <h3 className="text-sm sm:text-base font-black text-slate-950 leading-snug mt-0.5 line-clamp-2">
                            {item.name}
                          </h3>

                          {/* Quick Pack / Weight Pills inside the Slide */}
                          {quickOptions.length > 0 && (
                            <div className="mt-2.5">
                              <div className="text-[10px] font-bold text-slate-500 mb-1">
                                Select Pack / Weight:
                              </div>
                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 tabular-nums">
                                {quickOptions.map((opt) => {
                                  const isSelected = activeOpt.label === opt.label;
                                  return (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() =>
                                        setSelectedOptions((prev) => ({
                                          ...prev,
                                          [item.id]: opt,
                                        }))
                                      }
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#0d647d] text-white border-[#0d647d] shadow-2xs'
                                          : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Price & Instant 1-Tap Add to Order Bar */}
                      <div className="mt-4 pt-3 border-t border-amber-200/70 flex items-center justify-between gap-3 tabular-nums">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            Pack: <strong className="text-slate-800">{activeOpt.label}</strong>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-black text-slate-950">
                              ₹{activeOpt.price}
                            </span>
                            {hasDiscount && activeOpt.mrp && (
                              <span className="text-xs text-slate-400 line-through font-semibold">
                                ₹{activeOpt.mrp}
                              </span>
                            )}
                            {hasDiscount && savedAmount > 0 && (
                              <span className="text-xs font-extrabold text-emerald-700">
                                Save ₹{savedAmount}
                              </span>
                            )}
                          </div>
                        </div>

                        {inCartQty === 0 ? (
                          <button
                            type="button"
                            aria-label={`Add best item ${item.name}`}
                            onClick={() =>
                              updateCartQty(item, 1, {
                                selectedUnit: activeOpt.label,
                                unitPrice: activeOpt.price,
                                unitMrp: activeOpt.mrp,
                              })
                            }
                            className="px-5 py-2.5 rounded-2xl bg-[#ffd814] hover:bg-[#f7ca00] active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>Add to Order</span>
                          </button>
                        ) : (
                          <div className="flex items-center bg-emerald-600 text-white rounded-2xl overflow-hidden text-sm font-black shadow-sm shrink-0">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() =>
                                updateCartQty(item, -1, {
                                  selectedUnit: activeOpt.label,
                                  unitPrice: activeOpt.price,
                                  unitMrp: activeOpt.mrp,
                                })
                              }
                              className="px-3 py-2 hover:bg-emerald-700 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2.5">{inCartQty}</span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() =>
                                updateCartQty(item, 1, {
                                  selectedUnit: activeOpt.label,
                                  unitPrice: activeOpt.price,
                                  unitMrp: activeOpt.mrp,
                                })
                              }
                              className="px-3 py-2 hover:bg-emerald-700 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
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

      {/* ===================================================================== */}
      {/* MAIN GROCERY CATALOG GRID                                             */}
      {/* ===================================================================== */}
      <main
        ref={catalogSectionRef}
        className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 flex-1 w-full"
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
                setSelectedCategory('all');
                setInStockOnly(false);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0d647d] text-white text-xs font-bold hover:bg-sky-900 cursor-pointer"
            >
              Show All Store Items
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomerProducts.map((product) => {
              const activeOpt = getActiveOptionForProduct(product);
              const activeCartKey = makeCartKey(product.id, activeOpt.label);
              const inCartQty =
                cart[activeCartKey]?.qty ||
                (activeOpt.label === product.unit ? cart[product.id]?.qty || 0 : 0);

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
                  className={`group bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    product.inStock
                      ? 'border-slate-200/90 hover:border-[#0d647d] hover:shadow-md'
                      : 'border-slate-200 opacity-70 bg-slate-50'
                  }`}
                >
                  <div>
                    {/* Product Visual Box */}
                    <div className="relative h-36 bg-gradient-to-b from-slate-50 to-slate-100/60 flex items-center justify-center p-3 border-b border-slate-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <span className="text-6xl select-none filter drop-shadow-xs group-hover:scale-110 transition-transform duration-200">
                          {product.emoji || '🛍️'}
                        </span>
                      )}

                      {/* Top-Left Automatic Discount & Custom Tag Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        {hasDiscount && activeOpt.inStock && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider shadow-2xs tabular-nums">
                            {discountPercent}% OFF · Save ₹{savedAmount}
                          </span>
                        )}
                        {product.badge && (
                          <span className="px-2 py-0.5 rounded-md bg-[#0d647d] text-white font-semibold text-[10px] shadow-2xs">
                            {product.badge}
                          </span>
                        )}
                      </div>

                      {/* Top-Right Availability Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        {activeOpt.inStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3.5 space-y-2.5">
                      <div>
                        <div className="text-[11px] font-semibold text-[#0d647d] uppercase tracking-wider truncate">
                          {product.category}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 mt-0.5 min-h-[2.5rem]">
                          {product.name}
                        </h3>
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
                  <div className="px-3.5 pb-3.5 pt-2 flex items-end justify-between gap-2 border-t border-slate-100/80">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                        <span>Selected:</span>
                        <span className="font-bold text-slate-800">{activeOpt.label}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 tabular-nums mt-0.5">
                        <span className="text-lg sm:text-xl font-extrabold text-slate-900">
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
                    {activeOpt.inStock ? (
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
                          className="px-4 py-2 rounded-xl bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1 shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
                            onClick={() =>
                              updateCartQty(product, 1, {
                                selectedUnit: activeOpt.label,
                                unitPrice: activeOpt.price,
                                unitMrp: activeOpt.mrp,
                              })
                            }
                            className="p-2 hover:bg-emerald-700 transition-colors cursor-pointer"
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
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.1)]"
      >
        <div className="max-w-3xl mx-auto">
          {/* Product Thumbnails + Total & Saved + Yellow "Proceed" Pill Button */}
          <div className="px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-3 tabular-nums">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
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
              onClick={() => setIsCartOpen(true)}
              aria-label="Proceed to Order List"
              className="px-7 sm:px-9 py-3 rounded-full bg-[#ffd814] hover:bg-[#f7ca00] active:scale-98 text-slate-950 font-black text-sm sm:text-base shadow-sm transition-all cursor-pointer shrink-0"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
