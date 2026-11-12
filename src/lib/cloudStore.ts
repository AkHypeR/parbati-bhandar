import type { Product, StoreSettings } from '../utils/storeLogic';
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}
async function uploadDataUrl(value?: string, folder='misc'): Promise<string | undefined> {
  if (!value || !value.startsWith('data:')) return value;
  const result = await api<{url:string}>('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataUrl: value, folder }) });
  return result.url;
}
export async function fetchCloudCatalog() {
  const result = await api<{products: Product[]; settings: Partial<StoreSettings> | null}>('/api/catalog');
  return { products: result.products || [], settings: result.settings || undefined };
}
export async function saveCloudProducts(products: Product[]) {
  const rows = await Promise.all(products.map(async p => ({ ...p, imageUrl: await uploadDataUrl(p.imageUrl, `products-${p.id}`) })));
  await api('/api/products', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) });
}
export async function deleteCloudProducts(ids: string[]) {
  if (ids.length) await api('/api/products', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });
}
export async function saveCloudSettings(settings: StoreSettings) {
  const safe: any = { ...settings }; delete safe.ownerPin;
  if (safe.occasionImageUrl) safe.occasionImageUrl = await uploadDataUrl(safe.occasionImageUrl, 'store');
  if (safe.scannerImageUrl) safe.scannerImageUrl = await uploadDataUrl(safe.scannerImageUrl, 'store');
  await api('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(safe) });
}
