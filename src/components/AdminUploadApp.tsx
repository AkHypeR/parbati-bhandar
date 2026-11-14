import React, { useState, useEffect, useRef } from 'react';

const SEASONAL_COLLECTION_ICONS = [
  { label: 'Diwali', icon: '🪔' }, { label: 'Holi', icon: '🎨' }, { label: 'Durga Puja', icon: '🌺' },
  { label: 'Navratri', icon: '🔱' }, { label: 'Dussehra', icon: '🏹' }, { label: 'Chhath Puja', icon: '🌅' },
  { label: 'Makar Sankranti', icon: '🪁' }, { label: 'Lohri', icon: '🔥' }, { label: 'Baisakhi', icon: '🌾' },
  { label: 'Janmashtami', icon: '🦚' }, { label: 'Ganesh Chaturthi', icon: '🐘' }, { label: 'Mahashivratri', icon: '🕉️' },
  { label: 'Raksha Bandhan', icon: '🧵' }, { label: 'Karwa Chauth', icon: '🌙' }, { label: 'Eid', icon: '🌙' },
  { label: 'Poila Boishakh', icon: '🎉' }, { label: 'Saraswati Puja', icon: '📚' }, { label: 'Kali Puja', icon: '🪔' },
  { label: 'Jagaddhatri Puja', icon: '🌺' }, { label: 'Rath Yatra', icon: '🛕' }, { label: 'Poush Parbon', icon: '🥮' },
  { label: 'Nabanna', icon: '🌾' }, { label: 'Bhai Phonta', icon: '🪔' }, { label: 'Jamai Sasthi', icon: '🍽️' },
  { label: 'Ganga Sagar Mela', icon: '🌊' }, { label: 'Basanta Utsav', icon: '🎨' }, { label: 'Charak Gajan', icon: '🔱' },
  { label: 'Vishwakarma Puja', icon: '🪁' }, { label: 'Dol Jatra', icon: '🎨' },
  { label: 'Christmas', icon: '🎄' }, { label: 'New Year', icon: '🎉' }, { label: 'Wedding', icon: '💐' },
  { label: 'Puja / Aarti', icon: '🙏' }, { label: 'Flowers', icon: '🌼' }, { label: 'Sweets', icon: '🍬' },
  { label: 'Grocery', icon: '🛍️' }, { label: 'Fresh produce', icon: '🥬' }, { label: 'Special offer', icon: '🎁' },
  { label: 'Star', icon: '⭐' }, { label: 'Heart', icon: '❤️' },
] as const;

import {
  Lock,
  Plus,
  Package,
  Settings,
  QrCode,
  Camera,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Tag,
  Layers,
  Scale,
  AlertTriangle,
  Star,
  Globe,
  Upload,
  MessageCircle,
  ClipboardList,
  BellRing,
  Phone,
  Database,
  Download,
  FileUp,
} from 'lucide-react';
import {
  CATEGORIES,
  UNITS,
  PRESET_EMOJIS,
  PRESET_TAGS,
  Product,
  ProductVariety,
  StoreSettings,
  compressImageToBase64,
  calculateDiscountDetails,
  isProductLowStock,
  generateQrMatrix,
} from '../utils/storeLogic';

interface AdminUploadAppProps {
  products: Product[];
  productSyncStatus: 'loading' | 'saving' | 'saved' | 'error';
  filteredAdminProducts: Product[];
  storeSettings: StoreSettings;
  maintenanceMode: boolean;
  onToggleMaintenance: () => void;
  onSetMaintenanceTimer: (durationMinutes: number) => void;
  maintenanceUntil: number | null;
  adminTab: 'dashboard' | 'inventory' | 'add' | 'settings' | 'quickReplies' | 'orders' | 'christmasSpecials';
  setAdminTab: (tab: 'dashboard' | 'inventory' | 'add' | 'settings' | 'quickReplies' | 'orders' | 'christmasSpecials') => void;
  adminSearch: string;
  setAdminSearch: (q: string) => void;
  adminCategoryFilter: string;
  setAdminCategoryFilter: (cat: string) => void;
  adminLowStockOnly: boolean;
  setAdminLowStockOnly: (v: boolean) => void;
  inlinePriceEdits: Record<string, string>;
  setInlinePriceEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleToggleStock: (product: Product) => void;
  handleToggleBestItem: (product: Product) => void;
  handleSetBestItemRank: (product: Product, rank: number | null) => void;
  handleInlinePriceSave: (product: Product) => void;
  handleUpdateProductStockSettings: (
    product: Product,
    stockQuantity: number,
    lowStockThreshold: number
  ) => void;
  handleDeleteProduct: (productId: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  editingProduct: Product | null;
  setEditingProduct: (product: Product | null) => void;
  onSaveProduct: (
    payload: Omit<Product, 'id' | 'updatedAt'>,
    editingId?: string
  ) => void;
  onSaveSettings: (newSettings: StoreSettings) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  totalProductsCount: number;
  inStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  setActiveMode: (mode: 'customer' | 'admin') => void;
  setIsOwnerUnlocked: (unlocked: boolean) => void;
  setIsQrModalOpen: (open: boolean) => void;
  onRefreshProducts: () => Promise<void>;
}

interface VarietyFormRow {
  id: string;
  label: string;
  price: string;
  mrp: string;
  inStock: boolean;
}

async function uploadImageToCloudinary(dataUrl: string, folder: string): Promise<string> {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ dataUrl, folder }),
  });
  const result = await response.json();
  if (!response.ok || !result.url) {
    throw new Error(result.error || 'Image upload failed');
  }
  return result.url as string;
}

export function AdminUploadApp({
  products,
  productSyncStatus,
  filteredAdminProducts,
  storeSettings,
  maintenanceMode,
  onToggleMaintenance,
  onSetMaintenanceTimer,
  maintenanceUntil,
  adminTab,
  setAdminTab,
  adminSearch,
  setAdminSearch,
  adminCategoryFilter,
  setAdminCategoryFilter,
  adminLowStockOnly,
  setAdminLowStockOnly,
  inlinePriceEdits,
  setInlinePriceEdits,
  handleToggleStock,
  handleToggleBestItem,
  handleSetBestItemRank,
  handleInlinePriceSave,
  handleUpdateProductStockSettings,
  handleDeleteProduct,
  deleteConfirmId,
  setDeleteConfirmId,
  editingProduct,
  setEditingProduct,
  onSaveProduct,
  onSaveSettings,
  showToast,
  totalProductsCount,
  inStockCount,
  outOfStockCount,
  lowStockCount,
  setActiveMode,
  setIsOwnerUnlocked,
  setIsQrModalOpen,
  onRefreshProducts,
}: AdminUploadAppProps) {
  // Quick Upload Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Rice & Atta');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [unit, setUnit] = useState('1 kg');
  const [inStock, setInStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState('20');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [emoji, setEmoji] = useState('🌾');
  const [imageUrl, setImageUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [isBestItem, setIsBestItem] = useState(false);
  const [bestItemRank, setBestItemRank] = useState<number>(1);
  const [allowCustomWeights, setAllowCustomWeights] = useState(false);
  const [varietyRows, setVarietyRows] = useState<VarietyFormRow[]>([]);
  const [maintenanceHours, setMaintenanceHours] = useState('2');
  const [christmasSearch, setChristmasSearch] = useState('');
  const [replyCustomerName, setReplyCustomerName] = useState('');
  const [replyCustomerPhone, setReplyCustomerPhone] = useState('');
  const [missingProducts, setMissingProducts] = useState('');
  const [replyNote, setReplyNote] = useState('');
  type CustomerOrder = { id: string; orderNumber: number; customerName: string; customerPhone: string; note?: string; items: { productId?: string; name: string; quantity: number; unit: string; price: number; unavailable?: boolean }[]; total: number; status: 'new' | 'processing' | 'review' | 'ready' | 'unavailable' | 'completed' | 'cancelled'; createdAt: number; estimatedReadyAt?: number | null };
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const hasOrderSnapshotRef = useRef(false);
  const newOrdersCount = customerOrders.filter(order => order.status === 'new').length;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [dealSearch, setDealSearch] = useState('');
  const visibleCustomerOrders = customerOrders.filter(order => {
    const term = orderSearch.trim().toLowerCase();
    const matchesSearch = !term || [order.customerName, order.customerPhone, String(order.orderNumber)].some(value => value.toLowerCase().includes(term));
    return matchesSearch && (orderStatusFilter === 'all' || order.status === orderStatusFilter);
  });
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaysOrders = customerOrders.filter(order => order.createdAt >= todayStart.getTime());
  const todaysEstimatedSales = todaysOrders.filter(order => !['cancelled', 'unavailable'].includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState('30');
  const loadCustomerOrders = async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const response = await fetch('/api/orders', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load orders.');
      const incoming: CustomerOrder[] = Array.isArray(data.orders) ? data.orders : [];
      if (hasOrderSnapshotRef.current) {
        const freshOrders = incoming.filter(order => !knownOrderIdsRef.current.has(order.id));
        if (freshOrders.length) {
          const latest = freshOrders.sort((a, b) => b.createdAt - a.createdAt)[0];
          showToast(`New order received: #${latest.orderNumber} · ${latest.customerName}`);
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('New Parbati Bhandar order', {
                body: `Order #${latest.orderNumber} from ${latest.customerName}`,
                icon: '/favicon.svg',
                tag: `new-order-${latest.id}`
              });
            } catch { /* In-app alert remains available if browser notifications are blocked. */ }
          }
        }
      } else {
        hasOrderSnapshotRef.current = true;
      }
      knownOrderIdsRef.current = new Set(incoming.map(order => order.id));
      setCustomerOrders(incoming);
    } catch (error) {
      if (!silent) showToast((error as Error).message, 'error');
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };
  useEffect(() => {
    if (adminTab === 'orders') void loadCustomerOrders();
  }, [adminTab]);
  useEffect(() => {
    const pollOrders = () => {
      if (document.visibilityState === 'visible') void loadCustomerOrders(true);
    };
    const timer = window.setInterval(pollOrders, 15000);
    return () => window.clearInterval(timer);
  }, []);
  const updateCustomerOrder = async (id: string, status: CustomerOrder['status'], items?: CustomerOrder['items'], estimatedReadyAt?: number | null) => {
    setUpdatingOrderId(id);
    try {
      const response = await fetch('/api/orders', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...(items ? { items } : {}), ...(estimatedReadyAt !== undefined ? { estimatedReadyAt } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update order.');
      setCustomerOrders(prev => prev.map(order => order.id === id ? { ...order, status, ...(items ? { items } : {}), ...(estimatedReadyAt !== undefined ? { estimatedReadyAt } : status === 'ready' ? { estimatedReadyAt: null } : {}) } : order));
      let inventoryRefreshFailed = false;
      if (status === 'ready') {
        try { await onRefreshProducts(); }
        catch { inventoryRefreshFailed = true; }
      }
      const notificationNote = ({
        'not-configured': ' Push alerts are not configured on Cloudflare.',
        'customer-not-subscribed': ' Customer did not enable notifications for this order at checkout.',
        'send-failed': ' The customer notification could not be sent.',
        'subscription-expired': ' The customer notification subscription has expired.'
      } as Record<string, string>)[data.notification] || '';
      showToast(inventoryRefreshFailed
        ? 'Order is ready, but inventory could not refresh. Reload the inventory tab.'
        : (estimatedReadyAt !== undefined ? (estimatedReadyAt ? 'Estimated ready time sent to customer.' : 'Estimated ready time cleared.') : items ? 'Item availability saved.' : 'Order status updated.') + notificationNote, inventoryRefreshFailed ? 'error' : (notificationNote ? 'error' : 'success'));
    } catch (error) { showToast((error as Error).message, 'error'); }
    finally { setUpdatingOrderId(null); }
  };
  const openOrderForReview = (order: CustomerOrder) => {
    setSelectedOrderId(order.id);
    // Opening an order does not change its status.
  };
  const deleteCustomerOrder = async (id: string) => {
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    setUpdatingOrderId(id);
    try {
      const response = await fetch('/api/orders', { method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete order.');
      setCustomerOrders(prev => prev.filter(order => order.id !== id));
      showToast('Order deleted.');
    } catch (error) { showToast((error as Error).message, 'error'); }
    finally { setUpdatingOrderId(null); }
  };
  const messageOrderCustomer = (order: CustomerOrder, kind: 'ready' | 'unavailable') => {
    const phone = order.customerPhone.replace(/\D/g, '');
    const relevantItems = kind === 'unavailable' ? order.items.filter(item => item.unavailable) : order.items.filter(item => !item.unavailable);
    const lines = relevantItems.map(item => `• ${item.name} — ${item.unit} × ${item.quantity}`).join('\n');
    const message = kind === 'ready'
      ? `নমস্কার ${order.customerName}! আপনার Parbati Bhandar-এর অর্ডারের উপলব্ধ পণ্যগুলি প্রস্তুত।\n\n${lines || 'আপনার অর্ডারটি প্রস্তুত।'}\n\nআপনি সুবিধামতো দোকান থেকে সংগ্রহ করতে পারেন। ধন্যবাদ।`
      : `নমস্কার ${order.customerName}, আপনার অর্ডারের নিচের পণ্যগুলি বর্তমানে স্টকে নেই:\n\n${lines || 'কোনও পণ্য unavailable হিসেবে চিহ্নিত করা হয়নি।'}\n\nদয়া করে দোকানের সঙ্গে যোগাযোগ করুন। ধন্যবাদ।`;
    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };


  // Inline Stock & Low Stock Threshold Edits in Inventory List
  const [inlineStockEdits, setInlineStockEdits] = useState<
    Record<string, { stockQuantity: string; lowStockThreshold: string }>
  >({});

  // Store Settings Form State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const occasionFileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSettingsForm(storeSettings);
  }, [storeSettings]);

  // Populate form when editing an existing product
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || '');
      setCategory(editingProduct.category || 'Rice & Atta');
      setPrice(editingProduct.price !== undefined ? String(editingProduct.price) : '');
      setMrp(editingProduct.mrp ? String(editingProduct.mrp) : '');
      setUnit(editingProduct.unit || '1 kg');
      setInStock(editingProduct.inStock !== false);
      setStockQuantity(
        editingProduct.stockQuantity !== undefined ? String(editingProduct.stockQuantity) : '20'
      );
      setLowStockThreshold(
        editingProduct.lowStockThreshold !== undefined
          ? String(editingProduct.lowStockThreshold)
          : '5'
      );
      setEmoji(editingProduct.emoji || '🌾');
      setImageUrl(editingProduct.imageUrl || '');
      setBadge(editingProduct.badge || '');
      setIsBestItem(Boolean(editingProduct.isBestItem));
      setBestItemRank(
        typeof editingProduct.bestItemRank === 'number' &&
          editingProduct.bestItemRank >= 1 &&
          editingProduct.bestItemRank <= 5
          ? editingProduct.bestItemRank
          : 1
      );
      setAllowCustomWeights(Boolean(editingProduct.allowCustomWeights));
      setVarietyRows(
        (editingProduct.varieties || []).map((v) => ({
          id: v.id,
          label: v.label,
          price: String(v.price),
          mrp: v.mrp ? String(v.mrp) : '',
          inStock: v.inStock !== false,
        }))
      );
      setAdminTab('add');
    }
  }, [editingProduct, setAdminTab]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setMrp('');
    setUnit('1 kg');
    setInStock(true);
    setStockQuantity('20');
    setLowStockThreshold('5');
    setImageUrl('');
    setBadge('');
    setIsBestItem(false);
    setBestItemRank(1);
    setAllowCustomWeights(false);
    setVarietyRows([]);
    setEditingProduct(null);
  };

  // Variety Builder Helpers
  const handleAddVarietyRow = (presetLabel = '', presetPrice = '', presetMrp = '') => {
    setVarietyRows((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${prev.length}`,
        label: presetLabel,
        price: presetPrice,
        mrp: presetMrp,
        inStock: true,
      },
    ]);
  };

  const handleAddAttaPresetVarieties = () => {
    const basePriceNum = Number(price) || 248;
    const oneKgPrice = unit === '5 kg' ? Math.round(basePriceNum / 4.8) : 52;
    setVarietyRows([
      {
        id: `var-${Date.now()}-5kg`,
        label: '5 kg Pack',
        price: price || '248',
        mrp: mrp || '285',
        inStock: true,
      },
      {
        id: `var-${Date.now()}-1kg`,
        label: '1 kg Pack',
        price: String(oneKgPrice),
        mrp: String(Math.round(oneKgPrice * 1.12)),
        inStock: true,
      },
    ]);
    if (!unit) setUnit('5 kg');
    if (!price) {
      setPrice('248');
      setMrp('285');
    }
  };

  const handleUpdateVarietyRow = (
    rowId: string,
    field: keyof VarietyFormRow,
    value: string | boolean
  ) => {
    setVarietyRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveVarietyRow = (rowId: string) => {
    setVarietyRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  // Handle Photo Upload from Mobile Camera or Gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file);
      const url = await uploadImageToCloudinary(compressed, 'products');
      setImageUrl(url);
      showToast('Product photo uploaded to Cloudinary!');
    } catch {
      showToast('Could not upload product photo to Cloudinary', 'error');
    }
  };

  // Handle Special Occasion Banner Image Upload
  const handleOccasionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file, 720, 0.8);
      const url = await uploadImageToCloudinary(compressed, 'banners');
      setSettingsForm((prev) => ({ ...prev, occasionImageUrl: url }));
      showToast('Banner photo uploaded to Cloudinary! Click Save Settings to publish.');
    } catch {
      showToast('Could not upload banner photo to Cloudinary', 'error');
    }
  };

  // Handle Store Scanner (QR Code) Image Upload
  const handleScannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file, 600, 0.85);
      const url = await uploadImageToCloudinary(compressed, 'scanner');
      setSettingsForm((prev) => ({
        ...prev,
        scannerImageUrl: url,
        scannerMode: 'upload',
      }));
      showToast('Scanner picture uploaded to Cloudinary! Click Save Settings to apply.');
    } catch {
      showToast('Could not upload scanner picture to Cloudinary', 'error');
    }
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || isNaN(Number(price)) || Number(price) <= 0) {
      showToast('Please enter a valid product name and selling price', 'error');
      return;
    }

    const cleanedVarieties: ProductVariety[] = varietyRows
      .filter((r) => r.label.trim() && Number(r.price) > 0)
      .map((r) => ({
        id: r.id,
        label: r.label.trim(),
        price: Number(r.price),
        mrp: r.mrp && Number(r.mrp) > 0 ? Number(r.mrp) : null,
        inStock: r.inStock,
      }));

    const parsedStockQty =
      stockQuantity !== '' && !isNaN(Number(stockQuantity))
        ? Math.max(0, Number(stockQuantity))
        : 20;
    const parsedThreshold =
      lowStockThreshold !== '' && !isNaN(Number(lowStockThreshold))
        ? Math.max(0, Number(lowStockThreshold))
        : 5;

    onSaveProduct(
      {
        name: name.trim(),
        category,
        price: Number(price),
        mrp: mrp ? Number(mrp) : null,
        unit,
        inStock,
        stockQuantity: parsedStockQty,
        lowStockThreshold: parsedThreshold,
        emoji,
        imageUrl: imageUrl.trim(),
        badge: badge.trim(),
        isBestItem,
        bestItemRank: isBestItem ? bestItemRank : null,
        allowCustomWeights,
        varieties: cleanedVarieties.length > 0 ? cleanedVarieties : undefined,
      },
      editingProduct?.id
    );

    resetForm();
    if (editingProduct) {
      setAdminTab('inventory');
    }
  };

  const downloadFullBackup = async () => {
    try {
      const response = await fetch('/api/backup', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Backup download failed.'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `parbati-bhandar-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      showToast('Full store backup downloaded.');
    } catch (error) { showToast((error as Error).message, 'error'); }
  };

  const restoreFullBackup = async (file?: File) => {
    if (!file) return;
    if (!window.confirm('Restore this version 2 backup? It will replace the current catalogue, store settings, orders and inventory history in one database transaction. Existing customer accounts and passwords are preserved. Download a fresh backup first.')) {
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      const response = await fetch('/api/backup', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Restore failed.');
      showToast(`Restored ${result.productsRestored} products and ${result.ordersRestored} orders. Reloading…`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) { showToast((error as Error).message, 'error'); }
    finally { if (backupFileInputRef.current) backupFileInputRef.current.value = ''; }
  };

  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm.storeName.trim()) {
      showToast('Store name is required', 'error');
      return;
    }
    onSaveSettings(settingsForm);
  };

  const liveFormDiscount = calculateDiscountDetails(
    Number(price) || 0,
    mrp ? Number(mrp) : null
  );

  const liveFormLowStock = isProductLowStock({
    stockQuantity: stockQuantity !== '' ? Number(stockQuantity) : undefined,
    lowStockThreshold: lowStockThreshold !== '' ? Number(lowStockThreshold) : undefined,
  });

  const restockProducts = products.filter(product =>
    product.inStock && isProductLowStock({
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
    })
  );
  const exportInventoryCsv = () => {
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Product', 'Category', 'Selling Price (INR)', 'MRP (INR)', 'Unit', 'In Stock', 'Stock Quantity', 'Low Stock Alert'],
      ...products.map(product => [
        product.name, product.category, product.price, product.mrp ?? '',
        product.unit, product.inStock ? 'Yes' : 'No',
        product.stockQuantity ?? '', product.lowStockThreshold ?? '',
      ]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `parbati-bhandar-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Inventory CSV downloaded.');
  };

  return (
    <div className="min-h-dvh flex-1 bg-[#f5f7fb] pb-16 text-slate-900">
      {/* Owner Admin Header */}
      <div className="border-b border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.04)]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-blue-800">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-800 text-sm text-white">প</span>
                  Parbati Bhandar · Owner portal
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-slate-300">
                  ·
                </span>
                <span
                  role="status"
                  aria-live="polite"
                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${productSyncStatus === 'saved' ? 'text-blue-700' : productSyncStatus === 'error' ? 'text-red-600' : 'text-amber-700'}`}
                  title={productSyncStatus === 'error' ? 'The latest product changes could not be confirmed as saved online.' : 'Product catalogue cloud sync status'}
                >
                  {productSyncStatus === 'saving' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {productSyncStatus === 'loading' && 'Checking cloud…'}
                  {productSyncStatus === 'saving' && 'Saving…'}
                  {productSyncStatus === 'saved' && <><CheckCircle2 className="w-3 h-3" /> Saved</>}
                  {productSyncStatus === 'error' && <><XCircle className="w-3 h-3" /> Sync failed</>}
                </span>
                <button
                  type="button"
                  onClick={() => setAdminTab('dashboard')}
                  aria-label="Go to owner dashboard"
                  aria-current={adminTab === 'dashboard' ? 'page' : undefined}
                  className={`ml-auto sm:ml-0 inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${adminTab === 'dashboard' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerUnlocked(false);
                    setActiveMode('customer');
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock Admin</span>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Owner portal</span><span aria-hidden="true">/</span>
                <span className="text-blue-700" aria-current="page">{({ dashboard: 'Dashboard', orders: 'Orders', inventory: 'Inventory', add: editingProduct ? 'Edit product' : 'Add product', settings: 'Store settings', quickReplies: 'WhatsApp replies', christmasSpecials: 'Seasonal collection' } as const)[adminTab]}</span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 leading-tight sm:text-3xl">
                {({ dashboard: 'Dashboard', orders: 'Order management', inventory: 'Inventory management', add: editingProduct ? 'Edit product' : 'Add a product', settings: 'Store settings', quickReplies: 'Customer communication', christmasSpecials: 'Seasonal collection' } as const)[adminTab]}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                {({ dashboard: 'Monitor store performance and daily operations.', orders: 'Review incoming orders, update preparation status and keep customers informed.', inventory: 'Manage product availability, pricing and stock levels.', add: 'Create or update products in your store catalogue.', settings: 'Manage store information, customer-facing content and operational preferences.', quickReplies: 'Manage reusable responses for customer enquiries.', christmasSpecials: 'Choose a festival theme, edit its icon and select featured products for the homepage.' } as const)[adminTab]}
              </p>
            </div>

            {/* Quick Stats (including Low Stock Alerts) */}
            <div className="grid w-full shrink-0 grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 tabular-nums sm:grid-cols-4 xl:w-auto xl:min-w-[430px]">
              <div className="px-2.5 sm:px-3 py-2 text-center rounded-xl bg-white border border-slate-100">
                <div className="text-lg font-extrabold text-slate-900">{totalProductsCount}</div>
                <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Total Items</div>
              </div>
              <div className="px-2.5 sm:px-3 py-2 text-center rounded-xl bg-white border border-slate-100">
                <div className="text-lg font-extrabold text-blue-600">{inStockCount}</div>
                <div className="text-[11px] font-semibold text-blue-700 whitespace-nowrap">In Stock</div>
              </div>
              <div className="px-2.5 sm:px-3 py-2 text-center rounded-xl bg-white border border-slate-100">
                <div className="text-lg font-extrabold text-amber-600 flex items-center justify-center gap-1">
                  {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  <span>{lowStockCount}</span>
                </div>
                <div className="text-[11px] font-semibold text-amber-800 whitespace-nowrap">Low Stock</div>
              </div>
              <div className="px-2.5 sm:px-3 py-1.5 text-center border-l border-slate-200">
                <div className="text-lg font-extrabold text-red-500">{outOfStockCount}</div>
                <div className="text-[11px] font-semibold text-red-600 whitespace-nowrap">Out of Stock</div>
              </div>
            </div>
          </div>

          {/* Owner workspace navigation */}
          <nav aria-label="Owner workspace sections" className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
            <button type="button" onClick={() => setAdminTab('dashboard')} aria-current={adminTab === 'dashboard' ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${adminTab === 'dashboard' ? 'bg-blue-800 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-900'}`}><Layers className="h-4 w-4" /> Overview</button>
            <button type="button" onClick={() => setAdminTab('orders')} aria-current={adminTab === 'orders' ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${adminTab === 'orders' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-blue-50'}`}><BellRing className="h-4 w-4" /> Orders {newOrdersCount > 0 && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">{newOrdersCount}</span>}</button>
            <button type="button" onClick={() => setAdminTab('inventory')} aria-current={adminTab === 'inventory' ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${adminTab === 'inventory' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-blue-50'}`}><Package className="h-4 w-4" /> Inventory</button>
            <button type="button" onClick={() => { setEditingProduct(null); setAdminTab('add'); }} aria-current={adminTab === 'add' ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${adminTab === 'add' ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-900'}`}><Plus className="h-4 w-4" /> Add product</button>
            <button type="button" onClick={() => setAdminTab('settings')} aria-current={adminTab === 'settings' ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${adminTab === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-blue-50'}`}><Settings className="h-4 w-4" /> Store settings</button>
            <button type="button" onClick={() => setAdminTab('christmasSpecials')} aria-current={adminTab === 'christmasSpecials' ? 'page' : undefined} className={adminTab === 'christmasSpecials' ? 'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold bg-red-700 text-white shadow-sm' : 'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold bg-white text-slate-700 hover:bg-red-50'}>🎊 Seasonal collection</button>
            <button type="button" onClick={() => setAdminTab('quickReplies')} aria-current={adminTab === 'quickReplies' ? 'page' : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${adminTab === 'quickReplies' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-blue-50'}`}><MessageCircle className="h-4 w-4" /> WhatsApp replies</button>
          </nav>
        </div>
      </div>

      {/* Main Admin Workspace */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8">

        {adminTab === 'dashboard' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Store overview</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Good day. Here’s your shop at a glance.</h2><p className="mt-1 text-sm text-slate-500">Your daily operations, orders and inventory in one place.</p></div>
              <span className={`rounded-full px-3 py-2 text-xs font-extrabold ${productSyncStatus === 'saved' ? 'bg-blue-100 text-blue-800' : productSyncStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{productSyncStatus === 'saved' ? '● Changes synced' : productSyncStatus === 'error' ? '● Sync needs attention' : productSyncStatus === 'saving' ? '● Saving changes' : '● Connecting to store'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <button type="button" onClick={() => setAdminTab('orders')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5"><span className="text-xs font-bold text-slate-500">Orders today</span><strong className="mt-2 block text-3xl font-black text-slate-950">{todaysOrders.length}</strong><span className="mt-1 block text-[11px] font-semibold text-blue-700">Open order centre →</span></button>
              <button type="button" onClick={() => setAdminTab('orders')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md sm:p-5"><span className="text-xs font-bold text-slate-500">New orders</span><strong className="mt-2 block text-3xl font-black text-amber-600">{newOrdersCount}</strong><span className="mt-1 block text-[11px] font-semibold text-amber-700">Needs your attention →</span></button>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,.035)] sm:p-5"><span className="text-xs font-bold text-slate-500">Estimated sales today</span><strong className="mt-2 block text-3xl font-black text-blue-700">₹{todaysEstimatedSales.toLocaleString('en-IN')}</strong><span className="mt-1 block text-[11px] text-slate-500">Excludes cancelled / unavailable</span></div>
              <button type="button" onClick={() => setAdminTab('inventory')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md sm:p-5"><span className="text-xs font-bold text-slate-500">Stock alerts</span><strong className="mt-2 block text-3xl font-black text-rose-600">{lowStockCount + outOfStockCount}</strong><span className="mt-1 block text-[11px] font-semibold text-rose-700">{lowStockCount} low · {outOfStockCount} unavailable →</span></button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,.04)] sm:p-6">
                <div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Recent orders</h3><p className="mt-1 text-xs text-slate-500">Latest customer activity</p></div><button type="button" onClick={() => setAdminTab('orders')} className="text-xs font-extrabold text-blue-700 hover:underline">View all →</button></div>
                {customerOrders.length ? <div className="mt-4 divide-y divide-slate-100">{[...customerOrders].sort((a,b) => b.createdAt-a.createdAt).slice(0,5).map(order => <button key={order.id} type="button" onClick={() => { openOrderForReview(order); setAdminTab('orders'); }} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50"><span className="min-w-0"><strong className="block truncate text-sm text-slate-800">#{order.orderNumber} · {order.customerName}</strong><span className="mt-0.5 block text-[11px] text-slate-500">{new Date(order.createdAt).toLocaleString('en-IN')}</span></span><span className="shrink-0 text-right"><strong className="block text-sm text-slate-900">₹{Number(order.total || 0).toLocaleString('en-IN')}</strong><span className="text-[10px] font-bold uppercase text-slate-500">{order.status}</span></span></button>)}</div> : <div className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center"><Package className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-700">No orders yet</p><p className="mt-1 text-xs text-slate-500">New customer orders will appear here.</p></div>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,.04)] sm:p-6"><h3 className="font-extrabold text-slate-900">Quick actions</h3><p className="mt-1 text-xs text-slate-500">Common tasks, one tap away.</p><div className="mt-4 grid gap-2"><button type="button" onClick={() => { setEditingProduct(null); setAdminTab('add'); }} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-left hover:bg-blue-100"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-white"><Plus className="h-4 w-4" /></span><span><strong className="block text-xs text-blue-950">Add a product</strong><span className="text-[11px] text-blue-800">Add a new item to your catalogue</span></span></button><button type="button" onClick={() => setAdminTab('inventory')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-800 text-white"><Package className="h-4 w-4" /></span><span><strong className="block text-xs text-slate-900">Update prices & stock</strong><span className="text-[11px] text-slate-600">Review availability and low-stock items</span></span></button><button type="button" onClick={() => setAdminTab('settings')} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-left hover:bg-amber-100"><span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500 text-white"><Settings className="h-4 w-4" /></span><span><strong className="block text-xs text-amber-950">Store settings</strong><span className="text-[11px] text-amber-800">Hours, deals and store controls</span></span></button><button type="button" onClick={() => setAdminTab('quickReplies')} className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-left hover:bg-sky-100"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-700 text-white"><MessageCircle className="h-4 w-4" /></span><span><strong className="block text-xs text-sky-950">Customer replies</strong><span className="text-[11px] text-sky-800">Prepare WhatsApp responses</span></span></button></div></div>
            </div>
          </section>
        )}

        {adminTab === 'orders' && (
          <section className="space-y-4">
            {selectedOrderId && customerOrders.some(order => order.id === selectedOrderId) ? (() => {
              const order = customerOrders.find(item => item.id === selectedOrderId)!;
              return (
                <div className="space-y-4">
                  <button type="button" onClick={() => setSelectedOrderId(null)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">← Back to all orders</button>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Order details</p><h2 className="mt-1 text-2xl font-black text-slate-900">Order #{order.orderNumber}</h2><p className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('en-IN')}</p></div>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase ${order.status === 'new' ? 'bg-blue-100 text-blue-800' : order.status === 'processing' ? 'bg-amber-100 text-amber-800' : order.status === 'ready' ? 'bg-blue-100 text-blue-800' : order.status === 'unavailable' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>{order.status === 'new' ? 'Order received' : order.status === 'processing' ? 'Processing' : order.status === 'ready' ? 'Ready for pickup' : order.status}</span>
                    </div>
                    <div className="grid gap-4 py-5 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Customer</p><p className="mt-1 text-lg font-extrabold text-slate-900">{order.customerName}</p><a onClick={event => event.stopPropagation()} href={`tel:${order.customerPhone}`} className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><Phone className="h-4 w-4" />{order.customerPhone}</a></div>
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Order value</p><p className="mt-1 text-2xl font-black text-slate-900">₹{Number(order.total || 0).toFixed(2)}</p><p className="text-xs text-slate-500">Estimated total; confirm at pickup</p></div>
                    </div>
                    {order.estimatedReadyAt && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-amber-800">Customer has been told</p><p className="mt-1 text-sm font-extrabold text-amber-950">Estimated ready by {new Date(order.estimatedReadyAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p></div>}
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-amber-950">Delay / preparation estimate</h3><p className="mt-1 text-xs text-amber-800">Send the customer an updated ready-time estimate.</p></div><span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-amber-800">Customer update</span></div>
                      <div className="mt-3 flex flex-wrap gap-2"><select aria-label="Estimated preparation time" value={delayMinutes} onChange={event => setDelayMinutes(event.target.value)} className="min-h-11 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-800"><option value="15">About 15 minutes</option><option value="30">About 30 minutes</option><option value="45">About 45 minutes</option><option value="60">About 1 hour</option><option value="90">About 1 hour 30 minutes</option><option value="120">About 2 hours</option></select><button type="button" disabled={updatingOrderId === order.id || !['new','processing'].includes(order.status)} onClick={() => void updateCustomerOrder(order.id, order.status, undefined, Date.now() + Number(delayMinutes) * 60000)} className="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50">Send estimate</button></div>
                      {order.estimatedReadyAt && <button type="button" disabled={updatingOrderId === order.id} onClick={() => void updateCustomerOrder(order.id, order.status, undefined, null)} className="mt-2 text-xs font-bold text-amber-900 underline disabled:opacity-50">Clear estimate</button>}
                      {!['new','processing'].includes(order.status) && <p className="mt-2 text-[11px] text-slate-500">Estimates can be changed while an order is received or being prepared.</p>}
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Items ordered · Set item availability</h3>
                        
                      </div>
                      <div className="divide-y divide-slate-100">{order.items.map((item,index) => <div key={index} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className={`font-bold ${item.unavailable ? 'text-amber-800 line-through' : 'text-slate-800'}`}>{item.name}</p><p className="text-xs text-slate-500">{item.unit} · Quantity {item.quantity}</p>{item.unavailable && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-900">Unavailable</span>}</div><div className="flex items-center gap-3"><strong className="shrink-0 text-slate-900">₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</strong><button type="button" disabled={updatingOrderId === order.id || !['new','processing','review'].includes(order.status)} onClick={() => updateCustomerOrder(order.id, order.status, order.items.map((entry,itemIndex) => itemIndex === index ? { ...entry, unavailable: !entry.unavailable } : entry))} className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${item.unavailable ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{item.unavailable ? 'Mark available' : 'Mark unavailable'}</button></div></div>)}</div>
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3"><div className="flex justify-between text-xs font-semibold text-slate-500"><span>Original order total</span><span>₹{Number(order.total || 0).toFixed(2)}</span></div><div className="flex justify-between text-xs font-semibold text-amber-800"><span>Unavailable items deduction</span><span>−₹{order.items.filter(item => item.unavailable).reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0),0).toFixed(2)}</span></div><div className="flex justify-between font-extrabold text-slate-900"><span>Customer payable total</span><span className="text-lg text-blue-800">₹{Math.max(0,order.total - order.items.filter(item => item.unavailable).reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0),0)).toFixed(2)}</span></div></div>
                    </div>
                    {order.note && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Customer note</strong><p className="mt-1">{order.note}</p></div>}
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <button type="button" disabled={updatingOrderId === order.id || order.status !== 'processing'} onClick={() => void updateCustomerOrder(order.id,'new')} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-800 disabled:opacity-50">Mark received</button>
                      <button type="button" disabled={updatingOrderId === order.id || order.status !== 'new'} onClick={() => void updateCustomerOrder(order.id,'processing')} className="rounded-lg bg-amber-500 px-3 py-3 text-sm font-bold text-white disabled:opacity-50">Start processing</button>
                      <button type="button" disabled={updatingOrderId === order.id || !['new','processing','review'].includes(order.status)} onClick={() => void updateCustomerOrder(order.id,'ready')} className="rounded-lg bg-blue-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-50">Confirm Ready</button>
                      <button type="button" disabled={updatingOrderId === order.id || order.status !== 'ready'} onClick={() => updateCustomerOrder(order.id,'completed')} className="rounded-lg bg-slate-200 px-3 py-3 text-sm font-bold text-slate-800 disabled:opacity-50">Completed</button>
                      <button type="button" disabled={updatingOrderId === order.id || ['ready','completed','cancelled'].includes(order.status)} onClick={() => updateCustomerOrder(order.id,'cancelled')} className="rounded-lg bg-red-50 px-3 py-3 text-sm font-bold text-red-700 disabled:opacity-50">Cancel</button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button type="button" disabled={updatingOrderId === order.id} onClick={() => { deleteCustomerOrder(order.id); setSelectedOrderId(null); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700 disabled:opacity-50 sm:col-span-2"><Trash2 className="mr-1 inline h-4 w-4" /> Delete Order</button>
                    </div>
                  </article>
                </div>
              );
            })() : (
            <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Customer Orders</h2>
                <p className="text-xs text-slate-500">Pickup requests saved from the customer shopping list.</p>
              </div>
              <button type="button" onClick={() => void loadCustomerOrders()} disabled={ordersLoading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-800">Orders today</p><p className="mt-1 text-xl font-extrabold text-blue-950">{todaysOrders.length}</p></div>
              <div className="rounded-xl bg-sky-50 p-3"><p className="text-xs font-semibold text-sky-800">Estimated order value today</p><p className="mt-1 text-xl font-extrabold text-sky-950">₹{todaysEstimatedSales.toFixed(2)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-600">Orders shown</p><p className="mt-1 text-xl font-extrabold text-slate-900">{visibleCustomerOrders.length} / {customerOrders.length}</p></div>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Search orders
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Customer, phone or order number" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-600" />
              </label>
              <label className="text-xs font-bold text-slate-700">Filter by status
                <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium">
                  <option value="all">All statuses</option><option value="new">Order received</option><option value="processing">Processing</option><option value="ready">Ready for pickup</option><option value="unavailable">Unavailable (legacy)</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            {ordersLoading && customerOrders.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Loading orders…</p> : customerOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="font-bold text-slate-700">No customer orders yet</p><p className="mt-1 text-xs text-slate-500">New shopping-list requests will appear here.</p></div> : (
              <div className="grid gap-3">
                {visibleCustomerOrders.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No orders match these filters.</p> : visibleCustomerOrders.map(order => (
                  <article key={order.id} role="button" tabIndex={0} aria-label={`Open order #${order.orderNumber} details`} onClick={() => setSelectedOrderId(order.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedOrderId(order.id); } }} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-slate-900">#{order.orderNumber} · {order.customerName}</h3>
                        <a href={`tel:${order.customerPhone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><Phone className="h-3 w-3" /> {order.customerPhone}</a>
                        <p className="mt-1 text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${order.status === 'new' ? 'bg-blue-100 text-blue-800' : order.status === 'processing' ? 'bg-amber-100 text-amber-800' : order.status === 'ready' ? 'bg-blue-100 text-blue-800' : order.status === 'unavailable' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>{order.status === 'new' ? 'Order received' : order.status === 'processing' ? 'Processing' : order.status === 'ready' ? 'Ready for pickup' : order.status}</span>
                    </div>
                    <div className="my-3 rounded-xl bg-slate-50 p-3">
                      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Items ordered</div>
                      <ul className="space-y-1">{order.items.map((item, index) => <li key={index} className="flex justify-between gap-3 text-xs text-slate-700"><span>{item.name} <span className="text-slate-400">({item.unit})</span></span><strong>× {item.quantity}</strong></li>)}</ul>
                      <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900"><span>Estimated total</span><span>₹{Number(order.total || 0).toFixed(2)}</span></div>
                    </div>
                    {order.note && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Note: {order.note}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={updatingOrderId === order.id} onClick={event => { event.stopPropagation(); setSelectedOrderId(order.id); }} className="rounded-lg bg-violet-700 px-2 py-2 text-xs font-bold text-white disabled:opacity-50">Open order</button>
                      <button type="button" disabled={updatingOrderId === order.id || ['completed','cancelled'].includes(order.status)} onClick={event => { event.stopPropagation(); deleteCustomerOrder(order.id); }} className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete Order</button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="text-center text-[11px] text-slate-500">Completed/cancelled orders are automatically deleted 7 days after their last status update. You can also delete any order manually.</p>
            </>
            )}
          </section>
        )}
        {adminTab === 'quickReplies' && (
          <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700"><MessageCircle className="h-6 w-6" /></div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Quick customer replies</h2>
                <p className="mt-1 text-sm text-slate-500">Send a ready-for-pickup reminder or tell a customer which items are unavailable. No order tracking is stored here.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Customer name
                <input value={replyCustomerName} onChange={e => setReplyCustomerName(e.target.value)} placeholder="Enter customer name" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-xs font-bold text-slate-700">WhatsApp number
                <input value={replyCustomerPhone} onChange={e => setReplyCustomerPhone(e.target.value)} inputMode="tel" placeholder="10-digit mobile number" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Unavailable products (if any)</label>
              <textarea value={missingProducts} onChange={e => setMissingProducts(e.target.value)} rows={3} placeholder="Example: Fortune Mustard Oil 1L, Moong Dal 500g" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Optional note</label>
              <input value={replyNote} onChange={e => setReplyNote(e.target.value)} placeholder="Example: The remaining items are ready" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => {
                const phone = replyCustomerPhone.replace(/\D/g, '');
                if (!replyCustomerName.trim() || phone.length < 10) { showToast('Enter customer name and a valid WhatsApp number.', 'error'); return; }
                const msg = `নমস্কার ${replyCustomerName.trim()}! আপনার Parbati Bhandar-এর অর্ডার লিস্ট তৈরি। আপনি সুবিধামতো যেকোনো সময় দোকান থেকে এসে সংগ্রহ করতে পারেন। ধন্যবাদ।${replyNote.trim() ? '\n\n' + replyNote.trim() : ''}`;
                window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
              }} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700">Ready for pickup message</button>
              <button type="button" onClick={() => {
                const phone = replyCustomerPhone.replace(/\D/g, '');
                if (!replyCustomerName.trim() || phone.length < 10) { showToast('Enter customer name and a valid WhatsApp number.', 'error'); return; }
                if (!missingProducts.trim()) { showToast('List the unavailable products first.', 'error'); return; }
                const msg = `নমস্কার ${replyCustomerName.trim()}, Parbati Bhandar থেকে বলছি। দুঃখিত, আপনার অর্ডার লিস্টের এই পণ্যগুলি বর্তমানে স্টকে নেই: ${missingProducts.trim()}।${replyNote.trim() ? '\\n\\n' + replyNote.trim() : ''} বাকি পণ্যগুলি সম্পর্কে জানতে আমাদের WhatsApp-এ রিপ্লাই করুন। ধন্যবাদ।`;
                window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
              }} className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-amber-300">Unavailable items message</button>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-500">WhatsApp opens with the message filled in. Review it and press Send yourself. This does not create a delivery workflow or automatically send messages.</p>
          </section>
        )}
        {/* ========================================== */}
        {/* TAB 1: UPLOAD / EDIT PRODUCT FORM          */}
        {/* ========================================== */}
        {adminTab === 'add' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-7 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {editingProduct ? `Editing: ${editingProduct.name}` : 'Upload New Grocery Item'}
                </h2>
                <p className="text-xs text-slate-500">
                  Fill in the details below and tap &ldquo;Add Product to Live Store&rdquo;
                </p>
              </div>
              {editingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setAdminTab('inventory');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-5">
              {/* Product Name */}
              <div>
                <label
                  htmlFor="product-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Product Name *
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Aashirvaad Shudh Chakki Atta, Miniket Rice, Tata Salt"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                />
              </div>

              {/* Category & Unit Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="product-category-select"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Category
                  </label>
                  <select
                    id="product-category-select"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      const found = CATEGORIES.find((c) => c.id === e.target.value);
                      if (found && !editingProduct) setEmoji(found.icon);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="product-unit-select"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Base Selling Unit / Quantity
                  </label>
                  <select
                    id="product-unit-select"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        per {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & MRP Row + Automatic Discount Preview */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="product-price-input"
                      className="block text-xs font-bold uppercase tracking-wider text-blue-800 mb-1.5"
                    >
                      Our Store Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        id="product-price-input"
                        type="number"
                        step="any"
                        min="1"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="65"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-base text-slate-900 tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="product-mrp-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
                    >
                      MRP ₹ (Auto-Shows Discount)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        id="product-mrp-input"
                        type="number"
                        step="any"
                        min="0"
                        value={mrp}
                        onChange={(e) => setMrp(e.target.value)}
                        placeholder="75"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-base text-slate-700 tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Automatic Discount Preview Banner */}
                {liveFormDiscount.hasDiscount ? (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs tabular-nums">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Auto Discount on Product Page:{' '}
                        <strong className="text-blue-700">
                          {liveFormDiscount.discountPercent}% OFF · Save ₹{liveFormDiscount.savedAmount}
                        </strong>
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700">
                      MRP ₹{mrp} → ₹{price}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Tip: Enter an MRP higher than Store Price to automatically show{' '}
                    <span className="font-semibold text-blue-700">% OFF &amp; Save ₹X</span> on the product card.
                  </p>
                )}
              </div>

              {/* ======================================================== */}
              {/* INVENTORY SETTINGS: STOCK QUANTITY & LOW STOCK THRESHOLD */}
              {/* ======================================================== */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    <Package className="w-4 h-4 text-blue-700" />
                    <span>Inventory Stock &amp; Low Stock Threshold Settings</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <span>Currently In Stock?</span>
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="product-stock-qty-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Current Stock Level (Units / Packs)
                    </label>
                    <input
                      id="product-stock-qty-input"
                      type="number"
                      min="0"
                      step="1"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="20"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="product-low-stock-threshold-input"
                      className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-1"
                    >
                      Low Stock Threshold (Alert Below)
                    </label>
                    <input
                      id="product-low-stock-threshold-input"
                      type="number"
                      min="1"
                      step="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      placeholder="5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white font-bold text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {liveFormLowStock ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs font-bold tabular-nums">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Low Stock Alert Active: Current stock ({stockQuantity}) is below threshold ({lowStockThreshold}). An Alert icon will appear in your inventory list.
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    When current stock drops below <strong>{lowStockThreshold || 0}</strong>, an{' '}
                    <span className="font-semibold text-amber-800">Alert icon</span> will automatically show in the Admin inventory list.
                  </p>
                )}

                {/* Feature in Homepage "Best 5" Hero Slider + Choose Slide Number (1-5) */}
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 space-y-3">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Star className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          Feature in Merged &ldquo;Best 5&rdquo; Hero Slider Bar (সেরা ৫ স্লাইডার)
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Slides automatically with the Festive Banner (or slides alone when Festive Banner is off).
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isBestItem}
                      onChange={(e) => setIsBestItem(e.target.checked)}
                      className="w-5 h-5 accent-amber-500 rounded shrink-0 cursor-pointer"
                    />
                  </label>

                  {isBestItem && (
                    <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-amber-950">
                        Select Slide Order Number (Which Shows First &rarr; Last):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setBestItemRank(num)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                              bestItemRank === num
                                ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-2xs'
                                : 'bg-white hover:bg-amber-100 text-slate-700 border-amber-300'
                            }`}
                          >
                            #{num} {num === 1 ? '(1st)' : num === 5 ? '(Last)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ======================================================== */}
              {/* SPECIAL SPACE: PRODUCT VARIETIES (e.g. 5kg & 1kg) & WEIGHTS */}
              {/* ======================================================== */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-950">
                      <Layers className="w-4 h-4 text-amber-700" />
                      <span>Product Varieties / Pack Sizes (e.g., 5 kg &amp; 1 kg Packet)</span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 mt-0.5">
                      Add multiple packet options for the same item (example: Aashirvaad Atta in 5 kg &amp; 1 kg) with separate prices.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleAddAttaPresetVarieties}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      + 5 kg &amp; 1 kg Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddVarietyRow('', '', '')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Pack Variety</span>
                    </button>
                  </div>
                </div>

                {/* Variety Rows List */}
                {varietyRows.length > 0 ? (
                  <div className="space-y-2.5">
                    {varietyRows.map((vRow, idx) => {
                      const rowDisc = calculateDiscountDetails(
                        Number(vRow.price) || 0,
                        vRow.mrp ? Number(vRow.mrp) : null
                      );
                      return (
                        <div
                          key={vRow.id}
                          className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                                Option {idx + 1} Pack Size / Label *
                              </label>
                              <input
                                type="text"
                                aria-label={`Variety ${idx + 1} label`}
                                value={vRow.label}
                                onChange={(e) =>
                                  handleUpdateVarietyRow(vRow.id, 'label', e.target.value)
                                }
                                placeholder="e.g., 5 kg Pack or 1 kg Pack"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 sm:col-span-5 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-blue-800 mb-0.5">
                                  Price ₹ *
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="1"
                                  aria-label={`Variety ${idx + 1} price`}
                                  value={vRow.price}
                                  onChange={(e) =>
                                    handleUpdateVarietyRow(vRow.id, 'price', e.target.value)
                                  }
                                  placeholder="248"
                                  className="w-full px-2.5 py-2 rounded-lg border border-blue-400 text-xs font-extrabold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                                  MRP ₹
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  aria-label={`Variety ${idx + 1} MRP`}
                                  value={vRow.mrp}
                                  onChange={(e) =>
                                    handleUpdateVarietyRow(vRow.id, 'mrp', e.target.value)
                                  }
                                  placeholder="285"
                                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end sm:col-span-2 gap-2 pt-1 sm:pt-4">
                              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={vRow.inStock}
                                  onChange={(e) =>
                                    handleUpdateVarietyRow(vRow.id, 'inStock', e.target.checked)
                                  }
                                  className="w-4 h-4 accent-blue-600 rounded"
                                />
                                <span>In Stock</span>
                              </label>
                              <button
                                type="button"
                                aria-label={`Remove variety ${idx + 1}`}
                                onClick={() => handleRemoveVarietyRow(vRow.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Remove Variety"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {rowDisc.hasDiscount && (
                            <div className="text-[11px] font-bold text-blue-700 tabular-nums">
                              ✓ Shows {rowDisc.discountPercent}% OFF (Save ₹{rowDisc.savedAmount}) on {vRow.label || 'this pack'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-950/75 bg-white/80 px-3 py-2.5 rounded-xl border border-amber-200/60">
                    No separate pack varieties added yet. Tap <strong>&ldquo;+ 5 kg &amp; 1 kg Preset&rdquo;</strong> or{' '}
                    <strong>&ldquo;+ Add Pack Variety&rdquo;</strong> if this item comes in multiple packet sizes.
                  </div>
                )}

                {/* Flexible Customer Loose Weight Selector Option */}
                <div className="pt-2 border-t border-amber-200/80">
                  <label className="flex items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-amber-200 cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <Scale className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Allow Customer Weight Selection (100g, 200g, 500g, 1 kg, 2 kg, 5 kg &amp; Custom gm/kg)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Great for loose Rice, Dal, Sugar, Spices, or Oil — automatically scales the price for any weight chosen by the customer.
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowCustomWeights}
                      onChange={(e) => setAllowCustomWeights(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Product Photo or Preset Grocery Icon */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Product Photo or Quick Icon
                  </span>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-red-600 font-semibold hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Camera / Gallery Upload Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-4xl shrink-0 overflow-hidden shadow-2xs">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span>{emoji}</span>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Take Photo / Upload from Phone</span>
                    </button>

                    <input
                      type="url"
                      aria-label="Paste image URL"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Or paste an image link (optional)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Quick Emoji Picker */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                    Or pick a clean grocery illustration if you don&apos;t have a photo:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_EMOJIS.map((item) => (
                      <button
                        type="button"
                        key={item.emoji}
                        aria-label={`Select ${item.label} icon`}
                        onClick={() => {
                          setEmoji(item.emoji);
                          setImageUrl('');
                        }}
                        title={item.label}
                        className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                          emoji === item.emoji && !imageUrl
                            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 scale-105'
                            : 'bg-white border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customizable Special Tag (e.g., Burdwan Special) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label
                    htmlFor="product-badge-input"
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Custom Special Tag (e.g., Burdwan Special)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="product-badge-input"
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="Type any tag: Burdwan Special, Fresh Arrival..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {badge && (
                      <button
                        type="button"
                        onClick={() => setBadge('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* One-Tap Preset Special Tags */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Or tap a quick tag (or type your own above):
                    </span>
                    {badge.trim() && (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                        Preview: {badge.trim()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TAGS.map((tagOption) => {
                      const isSelected = badge.trim().toLowerCase() === tagOption.toLowerCase();
                      return (
                        <button
                          key={tagOption}
                          type="button"
                          onClick={() => setBadge(isSelected ? '' : tagOption)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-400 hover:bg-amber-50'
                          }`}
                        >
                          {tagOption}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                <span>
                  {editingProduct ? 'Save Product Changes' : 'Add Product to Live Store'}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: MANAGE INVENTORY & QUICK PRICE EDIT */}
        {/* ========================================== */}
        {adminTab === 'inventory' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900">Inventory overview</h2>
                  <p className="mt-1 text-xs text-slate-500">A quick check of stock that may need attention.</p>
                </div>
                <button type="button" onClick={exportInventoryCsv} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100">
                  <Globe className="h-4 w-4" /> Export inventory CSV
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Catalogue</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{totalProductsCount}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-[11px] font-semibold text-blue-700">Available</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-blue-800">{inStockCount}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[11px] font-semibold text-amber-700">Restock soon</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-amber-800">{restockProducts.length}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-[11px] font-semibold text-rose-700">Unavailable</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-rose-800">{outOfStockCount}</p>
                </div>
              </div>
              {restockProducts.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-amber-900"><AlertTriangle className="mr-1 inline h-4 w-4" /> Restock attention</p>
                    <button type="button" onClick={() => setAdminLowStockOnly(true)} className="text-xs font-bold text-amber-900 underline underline-offset-2">View low-stock items</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {restockProducts.slice(0, 6).map(product => (
                      <span key={product.id} className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                        {product.name} · {product.stockQuantity ?? 0} left
                      </span>
                    ))}
                    {restockProducts.length > 6 && <span className="self-center text-[11px] text-amber-800">+{restockProducts.length - 6} more</span>}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-800"><CheckCircle2 className="mr-1 inline h-4 w-4" /> No low-stock products need attention right now.</p>
              )}
            </section>
            {/* =============================================================== */}
            {/* HERO SLIDER MANAGER: FESTIVE BANNER TOGGLE + BEST 5 ORDER (1-5) */}
            {/* =============================================================== */}
            <div className="bg-gradient-to-r from-amber-50 via-white to-blue-50 p-4 rounded-2xl border border-amber-300 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-amber-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-2xs shrink-0">
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Hero Slider Bar Manager • Festive Banner + Best 5 Order (#1 First &rarr; #5 Last)
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {storeSettings.showOccasionBanner !== false
                        ? 'Festive Banner is ON: Customer slider shows Festive Season first, then Best #1 to #5.'
                        : 'Festive Banner is OFF: Customer slider automatically slides ONLY Best #1 to #5 products.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onSaveSettings({
                      ...storeSettings,
                      showOccasionBanner: storeSettings.showOccasionBanner === false,
                    })
                  }
                  className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shrink-0 shadow-2xs ${
                    storeSettings.showOccasionBanner !== false
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  }`}
                >
                  <span>🪔 Festive Season Slide:</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/20 uppercase text-[10px]">
                    {storeSettings.showOccasionBanner !== false ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* 5 Ranked Slots Selector (#1 First to #5 Last) */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 tabular-nums">
                {[1, 2, 3, 4, 5].map((slotRank) => {
                  const slotProduct = products.find(
                    (p) => p.isBestItem && p.bestItemRank === slotRank
                  );
                  return (
                    <div
                      key={slotRank}
                      className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 font-black text-[10px]">
                          Slide #{slotRank}{' '}
                          {slotRank === 1 ? '(1st)' : slotRank === 5 ? '(Last)' : ''}
                        </span>
                        {slotProduct && (
                          <span className="text-xs font-extrabold text-blue-700">
                            ₹{slotProduct.price}
                          </span>
                        )}
                      </div>

                      <select
                        aria-label={`Select product for Best Slider Slot ${slotRank}`}
                        value={slotProduct?.id || ''}
                        onChange={(e) => {
                          const chosenId = e.target.value;
                          if (!chosenId) {
                            if (slotProduct) handleSetBestItemRank(slotProduct, null);
                            return;
                          }
                          const chosenProd = products.find((p) => p.id === chosenId);
                          if (chosenProd) {
                            handleSetBestItemRank(chosenProd, slotRank);
                          }
                        }}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="">-- Empty Slot #{slotRank} --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.emoji} {p.name.split('(')[0].trim()} (₹{p.price})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deals of the Day Manager */}
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg shadow-sm">🔥</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">Deals of the Day • Zepto-style offers</h3>
                    <p className="text-[11px] text-slate-600">Choose one or multiple products. Only selected, in-stock products appear to customers.</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={storeSettings.dealsOfDayEnabled === true}
                  onClick={() => onSaveSettings({ ...storeSettings, dealsOfDayEnabled: storeSettings.dealsOfDayEnabled !== true })}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-colors ${storeSettings.dealsOfDayEnabled === true ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  Deals section: {storeSettings.dealsOfDayEnabled === true ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700">{(storeSettings.dealProductIds || []).length} product(s) selected</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onSaveSettings({ ...storeSettings, dealProductIds: products.filter(p => p.inStock).map(p => p.id) })} className="text-blue-700 font-bold hover:underline">Select in-stock</button>
                  <button type="button" onClick={() => onSaveSettings({ ...storeSettings, dealProductIds: [] })} className="text-rose-700 font-bold hover:underline">Clear all</button>
                </div>
              </div>
              <label className="block text-xs font-bold text-slate-700">Find a product
                <input type="search" value={dealSearch} onChange={e => setDealSearch(e.target.value)} placeholder="Search product name or category…" className="mt-1.5 w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
              </label>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-rose-100 bg-white divide-y divide-slate-100">
                {products.filter(product => !dealSearch.trim() || [product.name, product.category].some(value => String(value || "").toLowerCase().includes(dealSearch.trim().toLowerCase()))).length === 0 ? <p className="p-4 text-center text-xs text-slate-500">No products match your search.</p> : products.filter(product => !dealSearch.trim() || [product.name, product.category].some(value => String(value || "").toLowerCase().includes(dealSearch.trim().toLowerCase()))).map(product => {
                  const selected = (storeSettings.dealProductIds || []).includes(product.id);
                  return (
                    <label key={product.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-rose-50">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = storeSettings.dealProductIds || [];
                          const nextIds = e.target.checked
                            ? [...current.filter(id => id !== product.id), product.id]
                            : current.filter(id => id !== product.id);
                          onSaveSettings({ ...storeSettings, dealProductIds: nextIds });
                        }}
                        className="w-4 h-4 accent-rose-600 shrink-0"
                      />
                      <span className="text-lg">{product.emoji || '🛍️'}</span>
                      <span className="min-w-0 flex-1 text-xs font-bold text-slate-800 truncate">{product.name}</span>
                      <span className="text-xs font-extrabold text-slate-900">₹{product.price}</span>
                      {!product.inStock && <span className="text-[9px] font-bold text-rose-600">OUT OF STOCK</span>}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">Turn the section ON when ready. Your selected products stay saved when you turn it OFF.</p>
            </div>

            {/* Search & Quick Add Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Filter inventory by name or category"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Filter inventory by name or category..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdminLowStockOnly(!adminLowStockOnly)}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                    adminLowStockOnly
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Low Stock Alerts ({lowStockCount})</span>
                </button>

                <select
                  aria-label="Filter inventory by category"
                  value={adminCategoryFilter}
                  onChange={(e) => setAdminCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setAdminTab('add');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
              {filteredAdminProducts.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="text-slate-500 font-medium">No products match your search.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminLowStockOnly(false);
                      setAdminSearch('');
                      setAdminCategoryFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer"
                  >
                    Show All Products
                  </button>
                </div>
              ) : (
                filteredAdminProducts.map((product) => {
                  const editedPrice =
                    inlinePriceEdits[product.id] !== undefined
                      ? inlinePriceEdits[product.id]
                      : String(product.price);
                  const hasPriceChanged =
                    inlinePriceEdits[product.id] !== undefined &&
                    Number(inlinePriceEdits[product.id]) !== Number(product.price);
                  const itemDiscount = calculateDiscountDetails(product.price, product.mrp);

                  const currentStockVal =
                    inlineStockEdits[product.id]?.stockQuantity !== undefined
                      ? inlineStockEdits[product.id].stockQuantity
                      : String(product.stockQuantity ?? 20);
                  const currentThresholdVal =
                    inlineStockEdits[product.id]?.lowStockThreshold !== undefined
                      ? inlineStockEdits[product.id].lowStockThreshold
                      : String(product.lowStockThreshold ?? 5);

                  const hasStockSettingsChanged =
                    inlineStockEdits[product.id] !== undefined &&
                    (Number(currentStockVal) !== Number(product.stockQuantity ?? 20) ||
                      Number(currentThresholdVal) !== Number(product.lowStockThreshold ?? 5));

                  const isLowStock = isProductLowStock({
                    stockQuantity: Number(currentStockVal),
                    lowStockThreshold: Number(currentThresholdVal),
                  });

                  return (
                    <div
                      key={product.id}
                      className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                        !product.inStock
                          ? 'bg-slate-50/60'
                          : isLowStock
                          ? 'bg-amber-50/40'
                          : ''
                      }`}
                    >
                      {/* Product Left Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span>{product.emoji || '🛍️'}</span>
                          )}
                          {isLowStock && (
                            <span
                              title={`Low Stock Alert: ${currentStockVal} left (Threshold: ${currentThresholdVal})`}
                              aria-label={`Low stock alert for ${product.name}`}
                              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm border-2 border-white"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                            <span className="font-bold uppercase tracking-wider text-blue-700">
                              {product.category}
                            </span>
                            {product.badge && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                                  {product.badge}
                                </span>
                              </>
                            )}
                            {itemDiscount.hasDiscount && (
                              <span className="font-bold text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded tabular-nums">
                                {itemDiscount.discountPercent}% OFF (Save ₹{itemDiscount.savedAmount})
                              </span>
                            )}
                            {isLowStock && (
                              <span className="inline-flex items-center gap-1 font-extrabold text-amber-950 bg-amber-200/90 border border-amber-400 px-2 py-0.5 rounded-md tabular-nums">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                <span>
                                  Low Stock Alert: {currentStockVal} left (Threshold: {currentThresholdVal})
                                </span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate mt-0.5 flex items-center gap-1.5">
                            <span>{product.name}</span>
                            {isLowStock && (
                              <AlertTriangle
                                className="w-4 h-4 text-amber-600 shrink-0"
                                aria-label="Alert: Stock below threshold"
                              />
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 tabular-nums">
                            Unit:{' '}
                            <span className="font-semibold text-slate-700">
                              per {product.unit}
                            </span>
                            {product.mrp ? ` · MRP: ₹${product.mrp}` : ''}
                            {product.allowCustomWeights ? ' · Loose Weights (200g/500g/2kg)' : ''}
                          </p>
                          {product.varieties && product.varieties.length > 0 && (
                            <p className="text-[11px] font-semibold text-amber-900 mt-0.5 tabular-nums">
                              Varieties:{' '}
                              {product.varieties
                                .map((v) => `${v.label} (₹${v.price})`)
                                .join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Controls Right: Stock & Threshold Settings + Quick Price Edit + Stock Toggle + Actions */}
                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* Per-Product Stock Quantity & Low Stock Threshold Inventory Settings */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 tabular-nums">
                          <div>
                            <label
                              htmlFor={`stock-qty-${product.id}`}
                              className="block text-[10px] font-bold uppercase text-slate-500"
                            >
                              Stock Qty
                            </label>
                            <input
                              id={`stock-qty-${product.id}`}
                              type="number"
                              min="0"
                              aria-label={`Stock quantity for ${product.name}`}
                              value={currentStockVal}
                              onChange={(e) =>
                                setInlineStockEdits((prev) => ({
                                  ...prev,
                                  [product.id]: {
                                    stockQuantity: e.target.value,
                                    lowStockThreshold: currentThresholdVal,
                                  },
                                }))
                              }
                              className={`w-16 px-2 py-1 rounded-lg border text-xs font-extrabold focus:outline-none bg-white ${
                                isLowStock
                                  ? 'border-amber-500 text-amber-950'
                                  : 'border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`low-threshold-${product.id}`}
                              className="block text-[10px] font-bold uppercase text-amber-800"
                            >
                              Low Alert &lt;
                            </label>
                            <input
                              id={`low-threshold-${product.id}`}
                              type="number"
                              min="1"
                              aria-label={`Low stock threshold for ${product.name}`}
                              value={currentThresholdVal}
                              onChange={(e) =>
                                setInlineStockEdits((prev) => ({
                                  ...prev,
                                  [product.id]: {
                                    stockQuantity: currentStockVal,
                                    lowStockThreshold: e.target.value,
                                  },
                                }))
                              }
                              className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none bg-white"
                            />
                          </div>

                          {hasStockSettingsChanged && (
                            <button
                              type="button"
                              aria-label={`Save stock settings for ${product.name}`}
                              onClick={() => {
                                handleUpdateProductStockSettings(
                                  product,
                                  Math.max(0, Number(currentStockVal) || 0),
                                  Math.max(1, Number(currentThresholdVal) || 1)
                                );
                                setInlineStockEdits((prev) => {
                                  const next = { ...prev };
                                  delete next[product.id];
                                  return next;
                                });
                              }}
                              className="self-end px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
                            >
                              Save
                            </button>
                          )}
                        </div>

                        {/* Quick Price Input */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              aria-label={`Price for ${product.name}`}
                              value={editedPrice}
                              onChange={(e) =>
                                setInlinePriceEdits((prev) => ({
                                  ...prev,
                                  [product.id]: e.target.value,
                                }))
                              }
                              className="w-full pl-6 pr-2 py-2 rounded-xl border border-slate-300 font-extrabold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white tabular-nums"
                            />
                          </div>
                          {hasPriceChanged && (
                            <button
                              type="button"
                              aria-label={`Save price for ${product.name}`}
                              onClick={() => handleInlinePriceSave(product)}
                              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs cursor-pointer whitespace-nowrap"
                            >
                              Save ₹
                            </button>
                          )}
                        </div>

                        {/* Best 5 Hero Slider Order Selector (#1 First to #5 Last) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            aria-label={`Best 5 slider position for ${product.name}`}
                            value={
                              product.isBestItem &&
                              typeof product.bestItemRank === 'number' &&
                              product.bestItemRank >= 1 &&
                              product.bestItemRank <= 5
                                ? String(product.bestItemRank)
                                : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                handleSetBestItemRank(product, null);
                              } else {
                                handleSetBestItemRank(product, Number(val));
                              }
                            }}
                            className={`px-2.5 py-2 rounded-xl font-extrabold text-xs border transition-all cursor-pointer tabular-nums ${
                              product.isBestItem
                                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                            }`}
                            title="Choose Best 5 Slider Order (#1 Shows First -> #5 Shows Last)"
                          >
                            <option value="">☆ Slider: Off</option>
                            <option value="1">★ Slide #1 (1st)</option>
                            <option value="2">★ Slide #2 (2nd)</option>
                            <option value="3">★ Slide #3 (3rd)</option>
                            <option value="4">★ Slide #4 (4th)</option>
                            <option value="5">★ Slide #5 (Last)</option>
                          </select>
                        </div>

                        {/* One-Tap In Stock / Out of Stock Button */}
                        <button
                          type="button"
                          aria-label={`Toggle stock for ${product.name}`}
                          onClick={() => handleToggleStock(product)}
                          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                            product.inStock
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                              : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                          }`}
                        >
                          {product.inStock ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span>Out of Stock</span>
                            </>
                          )}
                        </button>

                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => setEditingProduct(product)}
                            title="Edit Item Details"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === product.id ? (
                            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-xl border border-red-200">
                              <button
                                type="button"
                                aria-label={`Confirm delete ${product.name}`}
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-xs font-bold text-red-600 hover:underline px-1 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-slate-500 px-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete ${product.name}`}
                              onClick={() => setDeleteConfirmId(product.id)}
                              title="Delete Product"
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: STORE DETAILS & SETTINGS            */}
        {/* ========================================== */}
        {adminTab === 'christmasSpecials' && (
          <section className="space-y-5">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-blue-800 to-red-900 p-5 text-white shadow-lg sm:p-7">
              <div className="flex items-center gap-3"><span className="text-4xl">{storeSettings.seasonalCollectionIcon || "🎄"}</span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">Homepage festival &amp; seasonal shelf</p><h2 className="text-2xl font-black">{storeSettings.seasonalCollectionTitle || 'Christmas Specials'}</h2><p className="mt-1 text-xs text-blue-100">Choose the products customers see when they tap the seasonal banner.</p></div></div>
              <div className="mt-4 rounded-full bg-white/15 px-3 py-2 text-xs font-bold inline-flex">{(storeSettings.christmasSpecialProductIds || []).length} selected products</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="mb-4 block"><span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-600">Homepage collection name</span><input type="text" maxLength={60} value={storeSettings.seasonalCollectionTitle || 'Christmas Specials'} onChange={e => onSaveSettings({...storeSettings, seasonalCollectionTitle:e.target.value})} placeholder="e.g. Diwali Specials" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-blue-500"/><span className="mt-1 block text-[11px] text-slate-500">This name appears on the homepage collection and its banner button.</span></label>
              <div className="mb-4"><p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">Choose collection icon</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{SEASONAL_COLLECTION_ICONS.map(item => <button key={item.label} type="button" title={item.label} aria-label={item.label} aria-pressed={(storeSettings.seasonalCollectionIcon || '🎄') === item.icon} onClick={() => onSaveSettings({...storeSettings, seasonalCollectionIcon:item.icon})} className={'flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border p-2 transition ' + ((storeSettings.seasonalCollectionIcon || '🎄') === item.icon ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50')}><span className="text-2xl">{item.icon}</span><span className="text-center text-[10px] font-semibold leading-tight text-slate-600">{item.label}</span></button>)}</div><p className="mt-2 text-[11px] text-slate-500">Includes North Indian festivals and West Bengal celebrations such as Poila Boishakh, Saraswati Puja, Kali Puja, Jagaddhatri Puja, Rath Yatra and Poush Parbon. Your selection saves automatically.</p></div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-extrabold text-slate-900">Select seasonal products</h3><div className="flex gap-3 text-xs"><button type="button" onClick={() => onSaveSettings({...storeSettings, christmasSpecialProductIds: products.filter(p => p.inStock).map(p => p.id)})} className="font-bold text-blue-700">Select all available</button><button type="button" onClick={() => onSaveSettings({...storeSettings, christmasSpecialProductIds: []})} className="font-bold text-rose-700">Clear selection</button></div></div>
              <input type="search" value={christmasSearch} onChange={e => setChristmasSearch(e.target.value)} placeholder="Search products…" className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"/>
              <div className="grid max-h-[65vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {products.filter(p => !christmasSearch.trim() || [p.name,p.category].some(v => String(v || '').toLowerCase().includes(christmasSearch.trim().toLowerCase()))).map(product => {
                  const selected=(storeSettings.christmasSpecialProductIds || []).includes(product.id);
                  return <label key={product.id} className={'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ' + (selected ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-white')}>
                    <input type="checkbox" checked={selected} onChange={e => { const ids=new Set(storeSettings.christmasSpecialProductIds || []); if(e.target.checked) ids.add(product.id); else ids.delete(product.id); onSaveSettings({...storeSettings, christmasSpecialProductIds:Array.from(ids)}); }} className="h-4 w-4 accent-blue-700"/>
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 text-2xl">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-contain"/> : product.emoji}</span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{product.name}</strong><span className="text-xs text-slate-500">₹{product.price} · {product.inStock ? 'In stock' : 'Out of stock'}</span></span>
                    {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600"/>}
                  </label>;
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Selections save automatically. Out-of-stock products are hidden from customers until available again.</p>
            </div>
          </section>
        )}
        {adminTab === 'settings' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-7 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                  Parbati Bhandar Store Settings
                </h2>
                <p className="text-xs text-slate-500">
                  Customize your shop header, WhatsApp order number, opening schedule, and store details.
                </p>
              </div>
            </div>

            <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><Database className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-900">Backup &amp; restore</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Version 2 backup includes your catalogue, store settings, complete order records and inventory deduction/refund history. Customer passwords and active sessions are never exported.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={downloadFullBackup} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-800"><Download className="h-4 w-4" /> Download full backup</button>
                    <button type="button" onClick={() => backupFileInputRef.current?.click()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100"><FileUp className="h-4 w-4" /> Restore from backup</button>
                    <input ref={backupFileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={e => void restoreFullBackup(e.target.files?.[0])} />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-amber-800">Restore replaces catalogue, settings, orders and stock ledgers together. Customer accounts and passwords stay on this store; backups from another store may require matching customer accounts.</p>
                </div>
              </div>
            </section>
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-200 text-xl">🛠️</span><div><h3 className="text-sm font-black text-slate-900">Store maintenance mode</h3><p className="mt-1 text-xs leading-5 text-slate-600">When ON, customers see a maintenance screen and cannot browse, add items or place orders. Your owner portal stays available.</p><p className="mt-2 text-xs font-extrabold text-blue-700">Currently {maintenanceMode ? 'ON • Storefront paused' : 'OFF • Storefront live'}</p></div></div>
                <button type="button" role="switch" aria-checked={maintenanceMode} aria-label="Toggle store maintenance mode" onClick={onToggleMaintenance} className={'relative inline-flex h-10 w-[76px] shrink-0 items-center rounded-full p-1 transition-colors ' + (maintenanceMode ? 'bg-amber-500' : 'bg-blue-600')}><span className={'grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-black text-slate-900 shadow transition-transform ' + (maintenanceMode ? 'translate-x-9' : 'translate-x-0')}>{maintenanceMode ? 'ON' : 'OFF'}</span></button>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Automatic maintenance timer</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Set how long the store should stay paused. The storefront will reopen automatically when the timer ends.</p>
                  {maintenanceUntil && <p className="mt-2 text-xs font-bold text-amber-800">Scheduled to reopen: {new Date(maintenanceUntil).toLocaleString()}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex-1 text-xs font-bold text-slate-700">Duration (hours)
                    <input type="number" min="0.02" max="168" step="0.5" value={maintenanceHours} onChange={e => setMaintenanceHours(e.target.value)} className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-semibold" />
                  </label>
                  <button type="button" onClick={() => { const hours = Number(maintenanceHours); if (!Number.isFinite(hours) || hours <= 0 || hours > 168) { showToast('Enter a duration up to 168 hours (7 days).', 'error'); return; } onSetMaintenanceTimer(Math.max(1, Math.round(hours * 60))); }} className="self-end rounded-xl bg-amber-500 px-4 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400">Start timer &amp; enable</button>
                </div>
                <p className="text-[11px] text-slate-500">You can still turn maintenance OFF manually at any time.</p>
              </div>
            </div>
            <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
              <details open className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-900">
                  <span>Store profile & homepage text</span><span className="text-xs font-semibold text-slate-500 group-open:hidden">Show</span><span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Hide</span>
                </summary>
                <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="settings-store-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Grocery Store Name
                </label>
                <input
                  id="settings-store-name"
                  type="text"
                  required
                  value={settingsForm.storeName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, storeName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-tagline"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Welcome Tagline (English / বাংলা)
                </label>
                <input
                  id="settings-tagline"
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, tagline: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-announcement"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Top Announcement Banner
                </label>
                <input
                  id="settings-announcement"
                  type="text"
                  value={settingsForm.announcement}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, announcement: e.target.value })
                  }
                  placeholder="e.g., Fresh Miniket & Gobindobhog rice arrived today!"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              </div>
              </details>
              <details className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-900">
                  <span>Contact details & opening hours</span><span className="text-xs font-semibold text-slate-500 group-open:hidden">Show</span><span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Hide</span>
                </summary>
                <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="settings-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Display Phone Number
                  </label>
                  <input
                    id="settings-phone"
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-whatsapp"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    WhatsApp Order Number (with 91)
                  </label>
                  <input
                    id="settings-whatsapp"
                    type="text"
                    value={settingsForm.whatsappNumber || '919734765207'}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="settings-timings"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Opening Hours Text
                  </label>
                  <input
                    id="settings-timings"
                    type="text"
                    value={settingsForm.timings}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, timings: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>


              </div>

              <div>
                <label
                  htmlFor="settings-address"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Store Address
                </label>
                <input
                  id="settings-address"
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, address: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-2 space-y-2.5">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Automatic IST Open/Closed Schedule (7:00 AM – 10:00 PM)
                    </div>
                    <div className="text-xs text-slate-500">
                      Automatically shows &ldquo;Open Now&rdquo; between 7 AM and 10 PM India time
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.autoSchedule !== false}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, autoSchedule: e.target.checked })
                    }
                    className="w-5 h-5 accent-blue-600 rounded"
                  />
                </label>

                {!settingsForm.autoSchedule && (
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-slate-800">Manual Store Open Status</div>
                      <div className="text-xs text-slate-500">
                        Manually toggle whether Parbati Bhandar is currently open
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.isOpen}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, isOpen: e.target.checked })
                      }
                      className="w-5 h-5 accent-blue-600 rounded"
                    />
                  </label>
                )}
              </div>

              {/* ======================================================== */}
              {/* SPECIAL OCCASION BANNER & "NOMOSHKAR GRAHOK" SETTINGS    */}
              {/* ======================================================== */}
              </div>
              </details>
              <details className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-900">
                  <span>Homepage greeting & special occasion banner</span><span className="text-xs font-semibold text-slate-500 group-open:hidden">Show</span><span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Hide</span>
                </summary>
                <div className="mt-4 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Special Occasion Picture &amp; &ldquo;Nomoshkar Grahok&rdquo; Header
                    </h3>
                    <p className="text-xs text-slate-600">
                      Set a seasonal greeting, festival name and picture (e.g. Christmas, New Year, Durga Puja or Chhath Puja). Change it whenever the season changes.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer shrink-0">
                    <span>Show Banner</span>
                    <input
                      type="checkbox"
                      checked={settingsForm.showOccasionBanner !== false}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          showOccasionBanner: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="settings-greeting-top"
                      className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
                    >
                      Top Greeting Word
                    </label>
                    <input
                      id="settings-greeting-top"
                      type="text"
                      value={settingsForm.greetingTop || 'Nomoshkar'}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, greetingTop: e.target.value })
                      }
                      placeholder="Nomoshkar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="settings-greeting-main"
                      className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
                    >
                      Main Greeting Word
                    </label>
                    <input
                      id="settings-greeting-main"
                      type="text"
                      value={settingsForm.greetingMain || 'Grahok'}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, greetingMain: e.target.value })
                      }
                      placeholder="Grahok"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-extrabold"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="settings-eta-mins"
                      className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
                    >
                      Pickup/Delivery Badge (mins)
                    </label>
                    <input
                      id="settings-eta-mins"
                      type="text"
                      value={settingsForm.deliveryEtaMins || '10'}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, deliveryEtaMins: e.target.value })
                      }
                      placeholder="10"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="settings-occasion-title"
                      className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
                    >
                      Special Occasion Title
                    </label>
                    <input
                      id="settings-occasion-title"
                      type="text"
                      value={settingsForm.occasionTitle || ''}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, occasionTitle: e.target.value })
                      }
                      placeholder="e.g., Merry Christmas or Happy New Year"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="settings-occasion-subtitle"
                      className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
                    >
                      Occasion Subtitle
                    </label>
                    <input
                      id="settings-occasion-subtitle"
                      type="text"
                      value={settingsForm.occasionSubtitle || ''}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, occasionSubtitle: e.target.value })
                      }
                      placeholder="A sacred celebration"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Upload Special Occasion Photo or Choose Preset */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-700">
                    Special Occasion Banner Picture
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-24 h-24 rounded-2xl bg-white border border-amber-300 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {settingsForm.occasionImageUrl ? (
                        <img
                          src={settingsForm.occasionImageUrl}
                          alt="Occasion preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">🪔🙏</span>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <input
                        ref={occasionFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleOccasionFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => occasionFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-blue-600" />
                          <span>Choose from Gallery</span>
                        </button>

                      </div>
                      <input
                        type="text"
                        aria-label="Occasion image URL"
                        value={
                          settingsForm.occasionImageUrl?.startsWith('data:')
                            ? ''
                            : settingsForm.occasionImageUrl || ''
                        }
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, occasionImageUrl: e.target.value })
                        }
                        placeholder="Or paste any festival image URL..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Scanner (QR Code) Settings — Upload Scanner Pic OR Convert Website Link */}
              </div>
              </details>
              <details className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-900">
                  <span>Store QR code & scanner</span><span className="text-xs font-semibold text-slate-500 group-open:hidden">Show</span><span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Hide</span>
                </summary>
                <div className="mt-4 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-blue-700" />
                      <span>Store Scanner (QR Code) — Website Link to Scanner or Upload Pic</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Automatically convert your store website link into a QR scanner OR upload your own custom scanner picture.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Open Printable Scanner</span>
                  </button>
                </div>

                {/* Mode Selector: Website Link Converter vs Upload Scanner Picture */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, scannerMode: 'link' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      (settingsForm.scannerMode || 'link') === 'link'
                        ? 'bg-white border-blue-600 ring-2 ring-blue-500/30 shadow-2xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        1. Convert Store Website Link
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Paste any website link to generate QR scanner
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, scannerMode: 'upload' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      settingsForm.scannerMode === 'upload'
                        ? 'bg-white border-blue-600 ring-2 ring-blue-500/30 shadow-2xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        2. Upload Custom Scanner Pic
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Upload QR photo from phone or gallery
                      </div>
                    </div>
                  </button>
                </div>

                {/* Live Scanner Preview + Controls */}
                <div className="p-3.5 rounded-2xl bg-white border border-blue-200 flex flex-col sm:flex-row items-center gap-4">
                  {/* Live QR / Uploaded Scanner Preview Box */}
                  <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-blue-200 p-2 flex flex-col items-center justify-center shrink-0">
                    {settingsForm.scannerMode === 'upload' && settingsForm.scannerImageUrl ? (
                      <img
                        src={settingsForm.scannerImageUrl}
                        alt="Uploaded Store Scanner"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      (() => {
                        const previewLink =
                          settingsForm.storeWebsiteUrl?.trim() ||
                          (typeof window !== 'undefined'
                            ? window.location.origin
                            : settingsForm.mapsUrl);
                        const qrMatrix = generateQrMatrix(previewLink);
                        return (
                          <svg
                            viewBox="0 0 21 21"
                            role="img"
                            aria-label="Live Website Link QR Scanner Preview"
                            className="w-full h-full"
                            shapeRendering="crispEdges"
                          >
                            <rect width="21" height="21" fill="#ffffff" />
                            {qrMatrix.map((row, rIdx) =>
                              row.map((cell, cIdx) =>
                                cell ? (
                                  <rect
                                    key={`${rIdx}-${cIdx}`}
                                    x={cIdx}
                                    y={rIdx}
                                    width={1}
                                    height={1}
                                    fill="#172554"
                                  />
                                ) : null
                              )
                            )}
                          </svg>
                        );
                      })()
                    )}
                  </div>

                  {/* Controls for either Website Link to Scanner OR Upload Scanner Pic */}
                  <div className="flex-1 w-full space-y-2.5">
                    {(settingsForm.scannerMode || 'link') === 'link' ? (
                      <>
                        <label
                          htmlFor="settings-store-website-url"
                          className="block text-[11px] font-bold uppercase text-slate-700"
                        >
                          Store Website Link (Auto-Converts Into Scanner Automatically)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            id="settings-store-website-url"
                            type="text"
                            value={settingsForm.storeWebsiteUrl || ''}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                storeWebsiteUrl: e.target.value,
                                scannerMode: 'link',
                              })
                            }
                            placeholder={
                              typeof window !== 'undefined'
                                ? window.location.origin
                                : 'https://parbati-bhandar.web.app'
                            }
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const currentOrigin =
                                typeof window !== 'undefined'
                                  ? window.location.origin
                                  : settingsForm.mapsUrl;
                              setSettingsForm({
                                ...settingsForm,
                                storeWebsiteUrl: currentOrigin,
                                scannerMode: 'link',
                              });
                              showToast('Current store website link converted to QR Scanner!');
                            }}
                            className="px-3 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            Use Current Website Link
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Type or paste any store website URL above—the scanner on the left updates immediately!
                        </p>
                      </>
                    ) : (
                      <>
                        <label className="block text-[11px] font-bold uppercase text-slate-700">
                          Take or Upload Scanner Picture
                        </label>
                        <input
                          ref={scannerFileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleScannerFileChange}
                          className="hidden"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => scannerFileInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Choose from Gallery</span>
                          </button>
                          {settingsForm.scannerImageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setSettingsForm({
                                  ...settingsForm,
                                  scannerImageUrl: '',
                                  scannerMode: 'link',
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                            >
                              Remove Uploaded Pic
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          aria-label="Scanner image URL"
                          value={
                            settingsForm.scannerImageUrl?.startsWith('data:')
                              ? ''
                              : settingsForm.scannerImageUrl || ''
                          }
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              scannerImageUrl: e.target.value,
                              scannerMode: 'upload',
                            })
                          }
                          placeholder="Or paste direct image URL of your scanner..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              </div>
              </details>
              {/* Owner-Only Secret Access Explanation Card */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-700" />
                  <span>Owner-Only Hidden Login Active (Customers Cannot See Admin Login)</span>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  Owner changes require your authorised Supabase account. Open this portal by tapping the top <strong>Shop Name (Parbati Bhandar)</strong> 5 times, then sign in.
                </p>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm cursor-pointer"
                >
                  Save Parbati Bhandar Settings
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('customer')}
                  className="px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer whitespace-nowrap"
                >
                  Preview Storefront
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
