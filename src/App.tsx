import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode,
  HelpCircle,
  Eye,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  INITIAL_SAMPLE_PRODUCTS,
  DEFAULT_STORE_SETTINGS,
  Product,
  StoreSettings,
  CartMap,
  checkIsStoreOpenIST,
  filterAndSortCustomerProducts,
  filterAdminProducts,
  updateCartQuantity,
  calculateCartTotals,
  generateWhatsAppOrderText,
  buildWhatsAppUrl,
  isProductLowStock,
  assignBestItemRank,
} from './utils/storeLogic';
import { CustomerStorefront } from './components/CustomerStorefront';
import { CartDrawer } from './components/CartDrawer';
import { OwnerPinGate } from './components/OwnerPinGate';
import { AdminUploadApp } from './components/AdminUploadApp';
import { QrPosterModal, SetupGuideModal } from './components/Modals';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { fetchCloudCatalog, saveCloudProducts, deleteCloudProducts, saveCloudSettings } from './lib/cloudStore';

const STORAGE_KEYS = {
  PRODUCTS: 'parbati_bhandar_products_v5',
  SETTINGS: 'parbati_bhandar_settings_v2',
  CART: 'parbati_bhandar_cart_v2',
};

function loadInitialProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_SAMPLE_PRODUCTS;
}

function loadInitialSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STORE_SETTINGS, ...parsed };
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_STORE_SETTINGS;
}

function loadInitialCart(): CartMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(loadInitialProducts);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(loadInitialSettings);
  const [cart, setCart] = useState<CartMap>(loadInitialCart);

  // Mode Switcher: 'customer' | 'admin'
  const [activeMode, setActiveMode] = useState<'customer' | 'admin'>('customer');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('7001.akashroy@gmail.com');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [pinError, setPinError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const previousProductIds = useRef<string[]>([]);

  // Modals: QR Poster & Free Hosting Guide
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Customer View Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  // Customer Shopping List / Inquiry Drawer
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Admin View States
  const [adminTab, setAdminTab] = useState<'inventory' | 'add' | 'settings'>('inventory');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');
  const [adminLowStockOnly, setAdminLowStockOnly] = useState(false);
  const [inlinePriceEdits, setInlinePriceEdits] = useState<Record<string, string>>({});
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  };

  // Keep the cart local to this device; the live catalogue and settings are cloud-backed.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    async function loadCloud() {
      if (!isSupabaseConfigured || !supabase) {
        setCloudReady(true);
        showToast('Supabase keys are missing. Add the VITE_SUPABASE values to enable cloud sync.', 'error');
        return;
      }
      try {
        const { products: cloudProducts, settings } = await fetchCloudCatalog();
        if (cancelled) return;
        const nextProducts = cloudProducts.length ? cloudProducts : INITIAL_SAMPLE_PRODUCTS;
        setProducts(nextProducts);
        previousProductIds.current = nextProducts.map(p => p.id);
        if (settings) setStoreSettings({ ...DEFAULT_STORE_SETTINGS, ...settings });
        setCloudReady(true);
      } catch (error) {
        if (!cancelled) {
          setCloudReady(true);
          showToast(`Could not load the online catalogue: ${(error as Error).message}`, 'error');
        }
      }
    }
    void loadCloud();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cloudReady || !isOwnerUnlocked) return;
    const currentIds = products.map(p => p.id);
    const removed = previousProductIds.current.filter(id => !currentIds.includes(id));
    previousProductIds.current = currentIds;
    void saveCloudProducts(products).then(() => deleteCloudProducts(removed)).catch(error => {
      showToast(`Cloud product save failed: ${(error as Error).message}`, 'error');
    });
  }, [products, cloudReady, isOwnerUnlocked]);

  useEffect(() => {
    if (!cloudReady || !isOwnerUnlocked) return;
    void saveCloudSettings(storeSettings).catch(error => {
      showToast(`Cloud settings save failed: ${(error as Error).message}`, 'error');
    });
  }, [storeSettings, cloudReady, isOwnerUnlocked]);

  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CART && e.newValue) {
        try { setCart(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Secret Owner-Only Access via URL (?admin=1, ?owner=1, #admin) or Keyboard (Alt+O / Ctrl+Shift+O)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('admin') === '1' ||
      params.get('owner') === '1' ||
      window.location.hash === '#admin' ||
      window.location.hash === '#owner'
    ) {
      setActiveMode('admin');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'o') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o')) {
        e.preventDefault();
        setActiveMode('admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered & Sorted Products (Customer)
  const filteredCustomerProducts = useMemo(
    () =>
      filterAndSortCustomerProducts(products, {
        searchQuery,
        selectedCategory,
        inStockOnly,
        sortBy,
      }),
    [products, searchQuery, selectedCategory, inStockOnly, sortBy]
  );

  // Filtered Products (Admin)
  const filteredAdminProducts = useMemo(
    () =>
      filterAdminProducts(products, {
        adminSearch,
        adminCategoryFilter,
        lowStockOnly: adminLowStockOnly,
      }),
    [products, adminSearch, adminCategoryFilter, adminLowStockOnly]
  );

  // Shopping List / Cart Handlers
  const updateCartQty = (
    product: Product,
    delta: number,
    option?: { selectedUnit?: string; unitPrice?: number; unitMrp?: number | null }
  ) => {
    setCart((prev) => updateCartQuantity(prev, product, delta, option));
  };

  const { cartItemsList, cartTotalItems, cartTotalPrice, cartTotalSaved } = useMemo(
    () => calculateCartTotals(cart),
    [cart]
  );

  const orderText = useMemo(
    () =>
      generateWhatsAppOrderText({
        storeName: storeSettings.storeName,
        customerName,
        customerNote,
        cartItemsList,
        cartTotalPrice,
        cartTotalSaved,
      }),
    [
      storeSettings.storeName,
      customerName,
      customerNote,
      cartItemsList,
      cartTotalPrice,
      cartTotalSaved,
    ]
  );

  const whatsAppUrl = useMemo(
    () => buildWhatsAppUrl(storeSettings.whatsappNumber || storeSettings.phone, orderText),
    [storeSettings.whatsappNumber, storeSettings.phone, orderText]
  );

  const handleCopyShoppingList = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(orderText).catch(() => {});
    }
    setCopiedNotice(true);
    showToast('Shopping list copied to clipboard!');
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Admin CRUD Operations
  const handleToggleStock = (product: Product) => {
    const nextInStock = !product.inStock;
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id
          ? { ...item, inStock: nextInStock, updatedAt: Date.now() }
          : item
      )
    );
    showToast(`${product.name} marked as ${nextInStock ? 'In Stock' : 'Out of Stock'}`);
  };

  const handleSetBestItemRank = (product: Product, rank: number | null) => {
    setProducts((prev) => assignBestItemRank(prev, product.id, rank));
    if (rank === null) {
      showToast(`Removed "${product.name}" from Best 5 Hero Slider`);
    } else {
      showToast(
        `Set "${product.name}" as Slide #${rank} (${
          rank === 1 ? 'Shows First' : rank === 5 ? 'Shows Last' : `Position ${rank}`
        }) in Hero Slider!`
      );
    }
  };

  const handleToggleBestItem = (product: Product) => {
    if (product.isBestItem) {
      handleSetBestItemRank(product, null);
    } else {
      const usedRanks = new Set(
        products
          .filter((p) => p.isBestItem && typeof p.bestItemRank === 'number')
          .map((p) => p.bestItemRank as number)
      );
      let nextRank = 5;
      for (let r = 1; r <= 5; r++) {
        if (!usedRanks.has(r)) {
          nextRank = r;
          break;
        }
      }
      handleSetBestItemRank(product, nextRank);
    }
  };

  const handleInlinePriceSave = (product: Product) => {
    const newPriceVal = inlinePriceEdits[product.id];
    if (newPriceVal === undefined || newPriceVal === '' || isNaN(Number(newPriceVal))) return;
    const numericPrice = Number(newPriceVal);

    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id
          ? { ...item, price: numericPrice, updatedAt: Date.now() }
          : item
      )
    );
    setCart((prev) => {
      const next: CartMap = {};
      for (const [key, entry] of Object.entries(prev)) {
        if (entry.product.id === product.id) {
          const isBaseUnit = !entry.selectedUnit || entry.selectedUnit === product.unit;
          next[key] = {
            ...entry,
            unitPrice: isBaseUnit ? numericPrice : entry.unitPrice,
            product: { ...entry.product, price: numericPrice },
          };
        } else {
          next[key] = entry;
        }
      }
      return next;
    });
    setInlinePriceEdits((prev) => {
      const copy = { ...prev };
      delete copy[product.id];
      return copy;
    });
    showToast(`Updated ${product.name} price to ₹${numericPrice}`);
  };

  const handleUpdateProductStockSettings = (
    product: Product,
    stockQuantity: number,
    lowStockThreshold: number
  ) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id
          ? {
              ...item,
              stockQuantity,
              lowStockThreshold,
              inStock: stockQuantity > 0 ? item.inStock : false,
              updatedAt: Date.now(),
            }
          : item
      )
    );
    const isLow = isProductLowStock({ stockQuantity, lowStockThreshold });
    showToast(
      `Saved ${product.name}: Stock ${stockQuantity}, Threshold ${lowStockThreshold}${
        isLow ? ' (Low Stock Alert Active)' : ''
      }`
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== productId));
    setCart((prev) => {
      const next: CartMap = {};
      for (const [key, entry] of Object.entries(prev)) {
        if (entry.product.id !== productId) {
          next[key] = entry;
        }
      }
      return next;
    });
    setDeleteConfirmId(null);
    showToast('Product removed from Parbati Bhandar catalog');
  };

  const handleSaveProduct = (
    payload: Omit<Product, 'id' | 'updatedAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      setProducts((prev) => {
        const updated = prev.map((item) =>
          item.id === editingId
            ? { ...item, ...payload, id: editingId, updatedAt: Date.now() }
            : item
        );
        if (payload.isBestItem && payload.bestItemRank) {
          return assignBestItemRank(updated, editingId, payload.bestItemRank);
        }
        if (!payload.isBestItem) {
          return assignBestItemRank(updated, editingId, null);
        }
        return updated;
      });
      showToast(`Updated "${payload.name}" in Parbati Bhandar!`);
    } else {
      const newId = `pb-item-${Date.now()}`;
      const newProduct: Product = {
        ...payload,
        id: newId,
        updatedAt: Date.now(),
      };
      setProducts((prev) => {
        const nextList = [newProduct, ...prev];
        if (payload.isBestItem && payload.bestItemRank) {
          return assignBestItemRank(nextList, newId, payload.bestItemRank);
        }
        return nextList;
      });
      showToast(`Added "${payload.name}" to Parbati Bhandar!`);
    }
  };

  const handleSaveSettings = (newSettings: StoreSettings) => {
    setStoreSettings(newSettings);
    showToast('Parbati Bhandar settings updated!');
  };

  const handleResetSampleProducts = () => {
    setProducts(INITIAL_SAMPLE_PRODUCTS);
    showToast('Restored default 16 Parbati Bhandar products!');
  };

  const handleOwnerPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setPinError('Cloud login is not configured. Check the Supabase environment values.');
      return;
    }
    setAuthLoading(true);
    setPinError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ownerEmail.trim(), password: ownerPassword,
      });
      if (error) throw error;
      if (data.user?.email?.toLowerCase() !== '7001.akashroy@gmail.com') {
        await supabase.auth.signOut();
        throw new Error('This account is not authorised for the Parbati Bhandar owner portal.');
      }
      setIsOwnerUnlocked(true);
      setOwnerPassword('');
      showToast('Welcome to Parbati Bhandar Owner Portal!');
    } catch (error) {
      setPinError((error as Error).message || 'Sign-in failed. Check your email and password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOwnerSignOut = async () => {
    await supabase?.auth.signOut();
    setIsOwnerUnlocked(false);
    setActiveMode('customer');
    showToast('You have signed out of the owner portal.');
  };

  // Stats & Live Open Status
  const totalProductsCount = products.length;
  const inStockCount = products.filter((p) => p.inStock).length;
  const outOfStockCount = totalProductsCount - inStockCount;
  const lowStockCount = products.filter((p) => isProductLowStock(p)).length;
  const liveIsOpen = checkIsStoreOpenIST(storeSettings);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ================================================================= */}
      {/* TOP BAR SHOWN ONLY IN OWNER ADMIN MODE (Hidden from Customers!)   */}
      {/* ================================================================= */}
      {activeMode === 'admin' && (
        <div className="bg-slate-900 text-white z-40 shadow-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-base shadow-xs shrink-0">
                প
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold tracking-wide text-amber-400 whitespace-nowrap">
                    PARBATI BHANDAR • OWNER PORTAL
                  </span>
                  <span className="hidden md:inline text-[11px] text-emerald-300 font-medium">
                    · Secret Owner Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Owner access is protected by Supabase authentication
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                title="Print Store QR Code Poster"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Shop QR Poster</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                title="How to Publish for ₹0 Free"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">₹0 Free Setup Guide</span>
              </button>

              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={handleOwnerSignOut}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Exit to Customer Website</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('admin')}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-slate-950 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  {isOwnerUnlocked ? (
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Owner Upload App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* FLOATING TOAST NOTIFICATION                */}
      {/* ========================================== */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-28 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border bg-slate-900 text-white border-slate-700"
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW 1: CUSTOMER STOREFRONT WEBSITE        */}
      {/* ========================================== */}
      {activeMode === 'customer' ? (
        <>
          <CustomerStorefront
            storeSettings={storeSettings}
            liveIsOpen={liveIsOpen}
            inStockCount={inStockCount}
            products={products}
            filteredCustomerProducts={filteredCustomerProducts}
            loading={false}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            inStockOnly={inStockOnly}
            setInStockOnly={setInStockOnly}
            sortBy={sortBy}
            setSortBy={setSortBy}
            cart={cart}
            cartItemsList={cartItemsList}
            cartTotalItems={cartTotalItems}
            cartTotalPrice={cartTotalPrice}
            cartTotalSaved={cartTotalSaved}
            updateCartQty={updateCartQty}
            setIsCartOpen={setIsCartOpen}
            setIsQrModalOpen={setIsQrModalOpen}
            onSecretOwnerAccess={() => {
              setActiveMode('admin');
              showToast('Owner Portal Access Triggered');
            }}
          />
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItemsList={cartItemsList}
            cartTotalItems={cartTotalItems}
            cartTotalPrice={cartTotalPrice}
            cartTotalSaved={cartTotalSaved}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerNote={customerNote}
            setCustomerNote={setCustomerNote}
            updateCartQty={updateCartQty}
            clearCart={() => setCart({})}
            handleCopyShoppingList={handleCopyShoppingList}
            copiedNotice={copiedNotice}
            whatsAppUrl={whatsAppUrl}
            orderText={orderText}
          />
        </>
      ) : !isOwnerUnlocked ? (
        /* ========================================== */
        /* OWNER PIN PROTECTION SCREEN                */
        /* ========================================== */
        <OwnerPinGate
          email={ownerEmail}
          setEmail={setOwnerEmail}
          password={ownerPassword}
          setPassword={setOwnerPassword}
          pinError={pinError}
          loading={authLoading}
          onSubmit={handleOwnerPinLogin}
          onBackToCustomer={() => setActiveMode('customer')}
        />
      ) : (
        /* ========================================== */
        /* VIEW 2: OWNER UPLOAD & ADMIN APP           */
        /* ========================================== */
        <AdminUploadApp
          products={products}
          filteredAdminProducts={filteredAdminProducts}
          storeSettings={storeSettings}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          adminSearch={adminSearch}
          setAdminSearch={setAdminSearch}
          adminCategoryFilter={adminCategoryFilter}
          setAdminCategoryFilter={setAdminCategoryFilter}
          adminLowStockOnly={adminLowStockOnly}
          setAdminLowStockOnly={setAdminLowStockOnly}
          inlinePriceEdits={inlinePriceEdits}
          setInlinePriceEdits={setInlinePriceEdits}
          handleToggleStock={handleToggleStock}
          handleToggleBestItem={handleToggleBestItem}
          handleSetBestItemRank={handleSetBestItemRank}
          handleInlinePriceSave={handleInlinePriceSave}
          handleUpdateProductStockSettings={handleUpdateProductStockSettings}
          handleDeleteProduct={handleDeleteProduct}
          deleteConfirmId={deleteConfirmId}
          setDeleteConfirmId={setDeleteConfirmId}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          onSaveProduct={handleSaveProduct}
          onSaveSettings={handleSaveSettings}
          onResetSampleProducts={handleResetSampleProducts}
          showToast={showToast}
          totalProductsCount={totalProductsCount}
          inStockCount={inStockCount}
          outOfStockCount={outOfStockCount}
          lowStockCount={lowStockCount}
          setActiveMode={setActiveMode}
          setIsOwnerUnlocked={setIsOwnerUnlocked}
          setIsQrModalOpen={setIsQrModalOpen}
        />
      )}

      {/* ========================================== */}
      {/* MODALS: QR POSTER & ₹0 SETUP GUIDE         */}
      {/* ========================================== */}
      <QrPosterModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        storeSettings={storeSettings}
      />

      <SetupGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
