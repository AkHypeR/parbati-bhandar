import type { Product, StoreSettings } from '../utils/storeLogic';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

function requireHostedImageUrl(value: string | undefined, label: string): string | undefined {
  if (value?.startsWith('data:')) {
    throw new Error(`${label}: direct image uploads are disabled to avoid paid storage. Paste a publicly accessible image URL instead.`);
  }
  return value;
}

export async function fetchCloudCatalog() {
  const result = await api<{products: Product[]; settings: Partial<StoreSettings> | null}>('/api/catalog');
  return { products: result.products || [], settings: result.settings || undefined };
}

export async function saveCloudProducts(products: Product[]) {
  const rows = products.map(product => ({
    ...product,
    imageUrl: requireHostedImageUrl(product.imageUrl, `Image for ${product.name}`),
  }));
  await api('/api/products', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) });
}

export async function deleteCloudProducts(ids: string[]) {
  if (ids.length) await api('/api/products', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });
}

export async function saveCloudSettings(settings: StoreSettings) {
  const safe: any = { ...settings };
  delete safe.ownerPin;
  safe.occasionImageUrl = requireHostedImageUrl(safe.occasionImageUrl, 'Occasion banner');
  safe.scannerImageUrl = requireHostedImageUrl(safe.scannerImageUrl, 'Scanner image');
  await api('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(safe) });
}
