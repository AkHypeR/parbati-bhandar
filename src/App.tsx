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

function sanitizeCart(value: unknown): CartMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const safeEntries: [string, CartMap[string]][] = [];
  for (const [key, rawItem] of Object.entries(value as Record<string, unknown>)) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as Partial<CartMap[string]>;
    const product = item.product;
    const qty = Number(item.qty);
    if (!product || typeof product !== 'object' ||
        typeof product.id !== 'string' || typeof product.name !== 'string' ||
        !Number.isFinite(qty) || qty <= 0) continue;
    const selectedUnit = typeof item.selectedUnit === 'string' && item.selectedUnit
      ? item.selectedUnit : (product.unit || '1 unit');
    const unitPrice = Number(item.unitPrice ?? product.price ?? 0);
    safeEntries.push([key, {
      cartKey: typeof item.cartKey === 'string' ? item.cartKey : key,
      product,
      selectedUnit,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      unitMrp: item.unitMrp ?? product.mrp,
      qty,
    }]);
  }
  return Object.fromEntries(safeEntries);
}

function loadInitialCart(): CartMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    if (raw) return sanitizeCart(JSON.parse(raw));
  } catch {
    // ignore storage errors
  }
  return {};
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(loadInitialProducts);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(loadInitialSettings);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceUntil, setMaintenanceUntil] = useState<number | null>(null);
  const [maintenanceNow, setMaintenanceNow] = useState(Date.now());
  const [maintenanceLogoTaps, setMaintenanceLogoTaps] = useState(0);
  const [cart, setCart] = useState<CartMap>(loadInitialCart);
  const cartReservationId = useRef<string>((() => {
    try {
      const existing = localStorage.getItem('parbati_bhandar_cart_reservation_v1');
      if (existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)) return existing;
      const created = crypto.randomUUID();
      localStorage.setItem('parbati_bhandar_cart_reservation_v1', created);
      return created;
    } catch { return crypto.randomUUID(); }
  })());
  const reservationQueueRef = useRef<Promise<any>>(Promise.resolve());


  // Mode Switcher: 'customer' | 'admin'
  const [activeMode, setActiveMode] = useState<'customer' | 'admin'>('customer');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [pinError, setPinError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [ownerCatalogReady, setOwnerCatalogReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [productSyncStatus, setProductSyncStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const productSyncRequest = useRef(0);
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [lastSavedOrderNumber, setLastSavedOrderNumber] = useState(() => {
    try { return localStorage.getItem('parbati_bhandar_last_order_number_v1') || ''; }
    catch { return ''; }
  });
  const [customerNote, setCustomerNote] = useState('');
  const [rememberCustomerDetails, setRememberCustomerDetails] = useState(false);

  // Restore only details the customer previously chose to remember on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('parbati_bhandar_customer_details_v1');
      if (!saved) return;
      const details = JSON.parse(saved);
      if (typeof details?.name === 'string' && typeof details?.phone === 'string') {
        setCustomerName(details.name.slice(0, 100));
        setCustomerPhone(details.phone.slice(0, 20));
        setRememberCustomerDetails(true);
      }
    } catch { /* Ignore unavailable or invalid local storage. */ }
  }, []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Admin View States
  const [adminTab, setAdminTab] = useState<'inventory' | 'add' | 'settings' | 'quickReplies' | 'orders'>('inventory');
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



  useEffect(() => {
    let cancelled = false;
    const refreshMaintenance = () => fetch('/api/settings', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : Promise.reject()).then(data => { if (!cancelled) { setMaintenanceMode(data?.settings?.maintenanceMode === true); setMaintenanceUntil(typeof data?.settings?.maintenanceUntil === 'number' ? data.settings.maintenanceUntil : null); } }).catch(() => {});
    void refreshMaintenance();
    const timer = window.setInterval(refreshMaintenance, 30000);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!maintenanceMode || !maintenanceUntil) return;
    const tick = window.setInterval(() => setMaintenanceNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [maintenanceMode, maintenanceUntil]);

  const handleToggleMaintenance = async () => {
    const next = !maintenanceMode;
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ maintenanceMode: next }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not update maintenance mode');
      setMaintenanceMode(next);
      showToast(next ? 'Maintenance mode is ON. Storefront paused.' : 'Maintenance mode is OFF. Storefront live.');
    } catch (error) { showToast((error as Error).message, 'error'); }
  };
  const handleSetMaintenanceTimer = async (durationMinutes: number) => {
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ maintenanceMode: true, durationMinutes }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not set maintenance timer');
      setMaintenanceMode(true);
      setMaintenanceUntil(result.maintenanceUntil || null);
      showToast('Maintenance timer set. Storefront will reopen automatically.');
    } catch (error) { showToast((error as Error).message, 'error'); }
  };
  // Hold finite inventory while items remain in the customer's cart. Holds
  // expire after 10 minutes and are refreshed every 3 minutes; checkout transfers
  // the hold into the order reservation so two shoppers cannot claim the last unit.
  useEffect(() => {
    if (!cloudReady || activeMode !== 'customer' || isOwnerUnlocked) return;
    const syncCartHold = () => {
      const items = Object.values(cart).map(item => ({
        productId: item.product.id,
        quantity: Number(item.qty || 0),
        unit: item.selectedUnit || item.product.unit || '1 unit'
      }));
      reservationQueueRef.current = reservationQueueRef.current.catch(() => {}).then(async () => {
        const response = await fetch('/api/cart-reservations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: cartReservationId.current, items })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) showToast(data.error || 'Could not reserve your cart stock. Please refresh.', 'error');
      }).catch(() => {});
    };
    syncCartHold();
  }, [cart, cloudReady, activeMode, isOwnerUnlocked]);

  // Low-stock products are held for five minutes, then removed if no order is placed.
  const lowStockCartStartedAt = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const lowStockInCart = new Set<string>();
    for (const item of Object.values(cart)) {
      const product = products.find((entry) => entry.id === item.product.id) || item.product;
      if (product.inStock && Number(product.stockQuantity) > 0 && isProductLowStock(product)) {
        lowStockInCart.add(product.id);
        if (!lowStockCartStartedAt.current.has(product.id)) lowStockCartStartedAt.current.set(product.id, Date.now());
      }
    }
    for (const id of Array.from(lowStockCartStartedAt.current.keys())) {
      if (!lowStockInCart.has(id)) lowStockCartStartedAt.current.delete(id);
    }
    const timers = Array.from(lowStockCartStartedAt.current.entries()).map(([productId, startedAt]) => {
      const remaining = Math.max(0, 5 * 60 * 1000 - (Date.now() - startedAt));
      return window.setTimeout(() => {
        setCart((prev) => {
          const next: CartMap = {};
          for (const [key, item] of Object.entries(prev)) if (item.product.id !== productId) next[key] = item;
          return next;
        });
        lowStockCartStartedAt.current.delete(productId);
        const expiredProduct = products.find((entry) => entry.id === productId);
        showToast((expiredProduct?.name || 'A low-stock item') + ' was removed from your cart after 5 minutes so another customer can order it.', 'error');
      }, remaining);
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [cart, products]);

  // Keep the cart local to this device; the live catalogue and settings are cloud-backed.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    async function loadCloud() {
      try {
        const { products: cloudProducts, settings } = await fetchCloudCatalog();
        if (cancelled) return;
        const nextProducts = cloudProducts.length ? cloudProducts : INITIAL_SAMPLE_PRODUCTS;
        setProducts(nextProducts);
        previousProductIds.current = nextProducts.map(p => p.id);
        if (settings) setStoreSettings({ ...DEFAULT_STORE_SETTINGS, ...settings });
        setProductSyncStatus('saved');
        setCloudReady(true);
      } catch (error) {
        if (!cancelled) {
          setProductSyncStatus('error');
          setCloudReady(true);
          showToast(`Could not load the Cloudflare catalogue: ${(error as Error).message}`, 'error');
        }
      }
    }
    void loadCloud();
    return () => { cancelled = true; };
  }, []);

  // Once the owner is authenticated, reload the private catalogue that includes
  // stock counts. The public catalogue deliberately omits those fields.
  useEffect(() => {
    if (!cloudReady || !isOwnerUnlocked) {
      setOwnerCatalogReady(false);
      return;
    }
    let cancelled = false;
    setOwnerCatalogReady(false);
    void fetchCloudCatalog().then(({ products: cloudProducts, settings }) => {
      if (cancelled) return;
      setProducts(cloudProducts);
      previousProductIds.current = cloudProducts.map(p => p.id);
      if (settings) setStoreSettings({ ...DEFAULT_STORE_SETTINGS, ...settings });
      setOwnerCatalogReady(true);
    }).catch(error => {
      if (!cancelled) {
        setProductSyncStatus('error');
        showToast(`Could not load owner inventory: ${(error as Error).message}`, 'error');
      }
    });
    return () => { cancelled = true; };
  }, [cloudReady, isOwnerUnlocked]);

  // Keep already-open customer storefronts in sync with stock changes.
  useEffect(() => {
    if (!cloudReady || activeMode !== 'customer' || isOwnerUnlocked) return;
    const timer = window.setInterval(() => {
      void fetchCloudCatalog().then(({ products: cloudProducts }) => {
        setProducts(cloudProducts);
      }).catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [cloudReady, activeMode, isOwnerUnlocked]);

  const refreshCloudProducts = async () => {
    const { products: cloudProducts } = await fetchCloudCatalog();
    setProducts(cloudProducts);
    previousProductIds.current = cloudProducts.map(p => p.id);
  };

  useEffect(() => {
    if (!cloudReady || !isOwnerUnlocked || !ownerCatalogReady) return;
    const requestId = ++productSyncRequest.current;
    const currentIds = products.map(p => p.id);
    const removed = previousProductIds.current.filter(id => !currentIds.includes(id));
    previousProductIds.current = currentIds;
    setProductSyncStatus('saving');
    void saveCloudProducts(products)
      .then(() => deleteCloudProducts(removed))
      .then(() => {
        if (productSyncRequest.current === requestId) setProductSyncStatus('saved');
      })
      .catch(error => {
        if (productSyncRequest.current === requestId) {
          setProductSyncStatus('error');
          showToast(`Cloud product save failed: ${(error as Error).message}`, 'error');
        }
      });
  }, [products, cloudReady, isOwnerUnlocked, ownerCatalogReady]);

  useEffect(() => {
    if (!cloudReady || !isOwnerUnlocked || !ownerCatalogReady) return;
    void saveCloudSettings(storeSettings).catch(error => {
      showToast(`Cloud settings save failed: ${(error as Error).message}`, 'error');
    });
  }, [storeSettings, cloudReady, isOwnerUnlocked, ownerCatalogReady]);

  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CART && e.newValue) {
        try { setCart(sanitizeCart(JSON.parse(e.newValue))); } catch { /* ignore */ }
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
    const latestProduct = products.find((entry) => entry.id === product.id) || product;
    setCart((prev) => updateCartQuantity(prev, latestProduct, delta, option));
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

  const handleSaveCustomerOrder = async (turnstileToken: string, pushSubscription?: PushSubscriptionJSON | null): Promise<number | null> => {
    if (!checkIsStoreOpenIST(storeSettings)) { showToast('The store is closed. Orders cannot be placed right now.', 'error'); return null; }
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName, customerPhone, turnstileToken, pushSubscription, cartReservationId: cartReservationId.current, note: customerNote, items: cartItemsList.map(item => ({ productId: item.product.id, name: item.product.name, quantity: item.qty, unit: item.selectedUnit, price: item.unitPrice })) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not save order');
      if (rememberCustomerDetails) {
        try { localStorage.setItem('parbati_bhandar_customer_details_v1', JSON.stringify({ name: customerName.trim(), phone: customerPhone.trim() })); } catch { /* Saving details is optional. */ }
      } else {
        try { localStorage.removeItem('parbati_bhandar_customer_details_v1'); } catch { /* Ignore unavailable storage. */ }
      }
      const orderNumber = Number(result.orderNumber);
      if (!Number.isInteger(orderNumber) || orderNumber < 1) throw new Error('Order was saved, but its tracking number could not be confirmed.');
      setLastSavedOrderNumber(String(orderNumber));
      try { localStorage.setItem('parbati_bhandar_last_order_number_v1', String(orderNumber)); } catch { /* Tracking number can still be copied from WhatsApp. */ }
      showToast(`Order #${orderNumber} saved. Keep this number to track your order.`);
      return orderNumber;
    } catch (error) { showToast((error as Error).message, 'error'); return null; }
  };

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
    setAuthLoading(true);
    setPinError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: ownerPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Owner sign-in failed. Please try again.');
      }
      setIsOwnerUnlocked(true);
      setOwnerPassword('');
      showToast('Welcome to Parbati Bhandar Owner Portal!');
    } catch (error) {
      setPinError((error as Error).message || 'Owner sign-in failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOwnerSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setIsOwnerUnlocked(false);
      setActiveMode('customer');
      showToast('You have signed out of the owner portal.');
    }
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
                  Owner access is protected by Cloudflare secure sessions
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
        maintenanceMode ? (
          <div className="fixed inset-0 z-[100] min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#063b35] to-slate-900 text-white flex items-center justify-center px-5">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl animate-pulse" />
              <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl animate-pulse" />
              <div className="absolute left-[12%] top-[18%] h-2 w-2 rounded-full bg-amber-200 animate-ping" />
              <div className="absolute right-[16%] top-[28%] h-1.5 w-1.5 rounded-full bg-emerald-200 animate-ping [animation-delay:700ms]" />
              <div className="absolute bottom-[20%] left-[20%] h-1.5 w-1.5 rounded-full bg-white animate-ping [animation-delay:1200ms]" />
            </div>
            <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.09] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
              <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/80 to-transparent" />
              <div className="relative mx-auto mb-7 grid h-44 w-48 place-items-center" aria-hidden="true">
                <div className="absolute inset-1 rounded-full border border-dashed border-amber-200/45 animate-[spin_24s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full border border-emerald-200/25 animate-[spin_18s_linear_infinite_reverse]" />
                <div className="absolute right-2 top-5 h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.9)] animate-pulse" />
                <svg viewBox="0 0 220 190" className="relative z-10 h-40 w-44 drop-shadow-[0_14px_18px_rgba(0,0,0,0.22)] animate-[float_3.8s_ease-in-out_infinite]" role="img" aria-label="Illustration of a Bengali woman carrying a basket of groceries">
                  <ellipse cx="110" cy="176" rx="68" ry="8" fill="#071f1b" opacity=".25" />
                  {/* Traditional white sari with red border */}
                  <path d="M79 72 Q54 91 59 145 L83 164 L145 164 Q155 126 137 82 L119 67Z" fill="#fff8e9" stroke="#e8d9c4" strokeWidth="2"/>
                  <path d="M76 91 Q103 107 133 87 L145 164 L128 164 Q122 126 106 111 Q91 137 83 164 L65 151Z" fill="#c83d43"/>
                  <path d="M75 92 Q101 111 133 88" fill="none" stroke="#f6d6c5" strokeWidth="5"/>
                  <path d="M77 75 Q55 101 65 143" fill="none" stroke="#b8323b" strokeWidth="5"/>
                  {/* Hair and face */}
                  <path d="M78 49 Q76 16 109 17 Q144 18 141 57 L134 82 L82 78Z" fill="#211a19"/>
                  <ellipse cx="110" cy="51" rx="27" ry="32" fill="#b97850"/>
                  <path d="M84 45 Q87 18 111 19 Q137 20 138 48 Q124 35 109 36 Q96 39 84 45" fill="#211a19"/>
                  <circle cx="110" cy="54" r="2.3" fill="#38221d"/>
                  <path d="M107 67 Q111 70 115 67" fill="none" stroke="#7c3430" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="110" cy="79" r="3" fill="#b8323b"/>
                  {/* Arms carrying basket */}
                  <path d="M73 99 Q55 113 77 132 L92 137" fill="none" stroke="#b97850" strokeWidth="10" strokeLinecap="round"/>
                  <path d="M135 99 Q157 113 143 132 L128 137" fill="none" stroke="#b97850" strokeWidth="10" strokeLinecap="round"/>
                  {/* Woven bamboo basket */}
                  <path d="M70 118 Q110 105 150 118 L140 165 Q110 178 80 165Z" fill="#b87936" stroke="#70421f" strokeWidth="3"/>
                  <path d="M72 123 Q110 135 148 123 M75 137 Q110 149 145 137 M78 151 Q110 163 142 151" fill="none" stroke="#f0c27b" strokeWidth="3"/>
                  <path d="M87 116 Q91 93 110 93 Q130 93 134 116" fill="none" stroke="#e8b66d" strokeWidth="5"/>
                  {/* Groceries peeking out */}
                  <g className="animate-[float_2.8s_ease-in-out_infinite]">
                    <path d="M84 116 L83 79 Q96 72 108 80 L105 117Z" fill="#f2e5c6" stroke="#c8ad78" strokeWidth="2"/>
                    <path d="M88 86 L103 86 M87 94 L104 94" stroke="#c8ad78" strokeWidth="2"/>
                    <text x="95" y="108" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#80623a">RICE</text>
                  </g>
                  <g className="animate-[float_3.2s_ease-in-out_infinite]">
                    <rect x="112" y="77" width="17" height="39" rx="5" fill="#e9b83f" stroke="#9a6a17" strokeWidth="2"/>
                    <rect x="116" y="70" width="9" height="9" rx="2" fill="#b87926"/>
                    <rect x="115" y="91" width="11" height="12" rx="2" fill="#fff4d8"/>
                  </g>
                  <g className="animate-[float_3.5s_ease-in-out_infinite]">
                    <path d="M132 105 Q145 91 153 104 L151 118 L134 119Z" fill="#e8d9b2" stroke="#a18b5e" strokeWidth="2"/>
                    <path d="M137 108 L149 108" stroke="#a18b5e" strokeWidth="2"/>
                  </g>
                </svg>
              </div>
              <button type="button" aria-label="Parbati Bhandar" onClick={() => setMaintenanceLogoTaps(count => { if (count + 1 >= 5) { setActiveMode('admin'); showToast('Owner portal access'); return 0; } return count + 1; })} className="text-xs font-black uppercase tracking-[0.32em] text-amber-300 cursor-default select-none focus:outline-none">{'Parbati Bhandar'}</button>
              <h1 className="mt-4 bg-gradient-to-r from-white via-emerald-100 to-amber-200 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">We’ll be back soon!</h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-200 sm:text-base">We’re making a few improvements to serve you better. Online shopping is temporarily paused while we work behind the scenes.</p>
              <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-full border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-bold text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.08)]">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-70 animate-ping" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" /></span>
                <span>Store maintenance in progress</span>
                <span className="inline-flex gap-1"><i className="h-1 w-1 rounded-full bg-amber-200 animate-bounce" /><i className="h-1 w-1 rounded-full bg-amber-200 animate-bounce [animation-delay:150ms]" /><i className="h-1 w-1 rounded-full bg-amber-200 animate-bounce [animation-delay:300ms]" /></span>
              </div>
              {maintenanceUntil && maintenanceUntil > maintenanceNow && (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-200/20 bg-emerald-950/30 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-100/80">Estimated reopening in</p>
                  <p className="mt-2 font-mono text-3xl font-black tabular-nums tracking-wider text-white">{String(Math.floor((maintenanceUntil - maintenanceNow) / 3600000)).padStart(2, '0')}:{String(Math.floor(((maintenanceUntil - maintenanceNow) % 3600000) / 60000)).padStart(2, '0')}:{String(Math.floor(((maintenanceUntil - maintenanceNow) % 60000) / 1000)).padStart(2, '0')}</p>
                  <p className="mt-1 text-[11px] text-emerald-100/70">The store will reopen automatically when the timer ends</p>
                </div>
              )}
              <div className="mx-auto mt-8 h-1.5 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-emerald-300 animate-[shimmer_2.2s_ease-in-out_infinite]" /></div>
              <p className="mt-6 text-xs text-slate-400">Thank you for your patience • ধন্যবাদ</p>

            </div>
          </div>
        ) : (
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
            products={products}
            cartTotalItems={cartTotalItems}
            cartTotalPrice={cartTotalPrice}
            cartTotalSaved={cartTotalSaved}
            updateCartQty={updateCartQty}
            setIsCartOpen={setIsCartOpen}
            setIsQrModalOpen={setIsQrModalOpen}
            lastOrderNumber={lastSavedOrderNumber}
            lastOrderPhone={customerPhone}
            onSecretOwnerAccess={() => {
              setActiveMode('admin');
              showToast('Owner Portal Access Triggered');
            }}
          />
          <CartDrawer
            isOpen={isCartOpen}
            liveIsOpen={liveIsOpen}
            products={products}
            onClose={() => setIsCartOpen(false)}
            cartItemsList={cartItemsList}
            cartTotalItems={cartTotalItems}
            cartTotalPrice={cartTotalPrice}
            cartTotalSaved={cartTotalSaved}
            customerName={customerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            rememberCustomerDetails={rememberCustomerDetails}
            setRememberCustomerDetails={setRememberCustomerDetails}
            onSaveOrder={handleSaveCustomerOrder}
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
        )
      ) : !isOwnerUnlocked ? (
        /* ========================================== */
        /* OWNER PIN PROTECTION SCREEN                */
        /* ========================================== */
        <OwnerPinGate
          password={ownerPassword}
          setPassword={setOwnerPassword}
          pinError={pinError}
          loading={authLoading}
          onSubmit={handleOwnerPinLogin}
          onBackToCustomer={() => setActiveMode('customer')}
        />
      ) : !ownerCatalogReady ? (
        <div className="flex-1 grid place-items-center bg-slate-50 p-8 text-center">
          <div><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" /><p className="font-bold text-slate-800">Loading secure owner inventory…</p></div>
        </div>
      ) : (
        /* ========================================== */
        /* VIEW 2: OWNER UPLOAD & ADMIN APP           */
        /* ========================================== */
        <AdminUploadApp
          products={products}
          productSyncStatus={productSyncStatus}
          filteredAdminProducts={filteredAdminProducts}
          storeSettings={storeSettings}
          maintenanceMode={maintenanceMode}
          onToggleMaintenance={handleToggleMaintenance}
          onSetMaintenanceTimer={handleSetMaintenanceTimer}
          maintenanceUntil={maintenanceUntil}
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
            showToast={showToast}
          totalProductsCount={totalProductsCount}
          inStockCount={inStockCount}
          outOfStockCount={outOfStockCount}
          lowStockCount={lowStockCount}
          setActiveMode={setActiveMode}
          setIsOwnerUnlocked={setIsOwnerUnlocked}
          setIsQrModalOpen={setIsQrModalOpen}
          onRefreshProducts={refreshCloudProducts}
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
