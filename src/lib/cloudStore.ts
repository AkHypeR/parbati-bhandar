import { supabase } from './supabase';
import type { Product, StoreSettings } from '../utils/storeLogic';

const toProductRow = (p: Product) => ({
  id: p.id, name: p.name, category: p.category, price: p.price, mrp: p.mrp ?? null,
  unit: p.unit, in_stock: p.inStock, stock_quantity: p.stockQuantity ?? null,
  low_stock_threshold: p.lowStockThreshold ?? null, emoji: p.emoji, image_url: p.imageUrl || null,
  badge: p.badge || null, is_best_item: Boolean(p.isBestItem), best_item_rank: p.bestItemRank ?? null,
  allow_custom_weights: Boolean(p.allowCustomWeights), varieties: p.varieties || [],
  updated_at: new Date(p.updatedAt || Date.now()).toISOString(),
});
const fromProductRow = (r: any): Product => ({
  id:r.id, name:r.name, category:r.category, price:Number(r.price), mrp:r.mrp == null ? null : Number(r.mrp),
  unit:r.unit, inStock:r.in_stock, stockQuantity:r.stock_quantity == null ? undefined : Number(r.stock_quantity),
  lowStockThreshold:r.low_stock_threshold == null ? undefined : Number(r.low_stock_threshold),
  emoji:r.emoji || '🛒', imageUrl:r.image_url || '', badge:r.badge || '',
  isBestItem:Boolean(r.is_best_item), bestItemRank:r.best_item_rank ?? null,
  allowCustomWeights:Boolean(r.allow_custom_weights), varieties:Array.isArray(r.varieties) ? r.varieties : [],
  updatedAt:r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
});
const uploadedImageCache = new Map<string, string>();
async function uploadDataUrl(value?: string, folder='misc'): Promise<string | undefined> {
  if (!value || !value.startsWith('data:')) return value;
  const cached = uploadedImageCache.get(value);
  if (cached) return cached;
  if (!supabase) throw new Error('Supabase is not configured.');
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error('Image must be JPG, PNG or WebP.');
  const blob = await (await fetch(value)).blob();
  if (blob.size > 2 * 1024 * 1024) throw new Error('Image exceeds the 2 MB storage limit.');
  const ext = match[1] === 'image/png' ? 'png' : match[1] === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, blob, {
    contentType: match[1], upsert: false, cacheControl: '3600',
  });
  if (error) throw error;
  const publicUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  uploadedImageCache.set(value, publicUrl);
  return publicUrl;
}
export async function fetchCloudCatalog() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const [p, s] = await Promise.all([
    supabase.from('products').select('*').order('updated_at', { ascending: false }),
    supabase.from('store_settings').select('settings').eq('id', 1).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  if (s.error) throw s.error;
  return {
    products: (p.data || []).map(fromProductRow),
    settings: s.data?.settings as Partial<StoreSettings> | undefined,
  };
}
export async function saveCloudProducts(products: Product[]) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const rows = await Promise.all(products.map(async (p) => {
    const imageUrl = await uploadDataUrl(p.imageUrl, `products/${p.id}`);
    return toProductRow({ ...p, imageUrl });
  }));
  if (rows.length) {
    const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
}
export async function deleteCloudProducts(ids: string[]) {
  if (!supabase || !ids.length) return;
  const { error } = await supabase.from('products').delete().in('id', ids);
  if (error) throw error;
}
export async function saveCloudSettings(settings: StoreSettings) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const safe: any = { ...settings };
  delete safe.ownerPin;
  if (safe.occasionImageUrl) safe.occasionImageUrl = await uploadDataUrl(safe.occasionImageUrl, 'store');
  if (safe.scannerImageUrl) safe.scannerImageUrl = await uploadDataUrl(safe.scannerImageUrl, 'store');
  const { error } = await supabase.from('store_settings').upsert({
    id: 1, settings: safe, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}
