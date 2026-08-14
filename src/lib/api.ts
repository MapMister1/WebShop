import type { CartItem, Category, OrderSummary, Product } from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export function getProducts(params = '') {
  return request<{ products: Product[]; total: number; page: number; pageSize: number }>(`/api/products${params}`);
}

export function getProduct(slug: string) {
  return request<{ product: Product; related: Product[] }>(`/api/products/${encodeURIComponent(slug)}`);
}

export function getCategories() {
  return request<{ categories: Category[] }>('/api/categories');
}

export function beginCheckout(cart: CartItem[], discountCode?: string) {
  return request<{ url: string }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ items: cart, discountCode })
  });
}

export function getSuccess(sessionId: string) {
  return request<{ order: OrderSummary }>(`/api/orders/success?session_id=${encodeURIComponent(sessionId)}`);
}

export function sendContact(body: { name: string; email: string; message: string; website?: string }) {
  return request<{ ok: true }>('/api/contact', { method: 'POST', body: JSON.stringify(body) });
}

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    request<{ ok: true }>('/api/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<{ ok: true }>('/api/admin/logout', { method: 'POST' }),
  setup: (body: { email: string; password: string; bootstrapKey: string }) =>
    request<{ ok: true }>('/api/admin/setup', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ authenticated: boolean; email?: string }>('/api/admin/me'),
  dashboard: () => request<Record<string, unknown>>('/api/admin/dashboard'),
  products: () => request<{ products: Product[] }>('/api/admin/products'),
  saveProduct: (product: Record<string, unknown> & { id?: string }) =>
    request<{ product: Product }>(product.id ? `/api/admin/products/${product.id}` : '/api/admin/products', {
      method: product.id ? 'PATCH' : 'POST',
      body: JSON.stringify(product)
    }),
  deleteProduct: (id: string) => request<{ ok: true }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  orders: () => request<{ orders: unknown[] }>('/api/admin/orders'),
  updateOrder: (id: string, body: { fulfillment_status: string; tracking_number?: string }) =>
    request<{ ok: true }>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  settings: () => request<{ settings: Record<string, string> }>('/api/admin/settings'),
  saveSettings: (settings: Record<string, string>) =>
    request<{ ok: true }>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ settings }) })
};
