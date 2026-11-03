/**
 * MarketForge Centralized API Client (Gateway Target: http://localhost:8080)
 * Adheres strictly to docs/API.md contract.
 */

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
  }
  return process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mf_access_token');
}

export function setTokens(access: string, refresh?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mf_access_token', access);
  if (refresh) localStorage.setItem('mf_refresh_token', refresh);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mf_access_token');
  localStorage.removeItem('mf_refresh_token');
  localStorage.removeItem('mf_user');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      'SERVICE_UNAVAILABLE',
      'Tidak dapat terhubung ke API Gateway MarketForge.',
      503,
    );
  }

  // Handle Token Refresh on 401 if refreshToken exists
  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('mf_refresh_token');
    if (refreshToken && !endpoint.includes('/auth/')) {
      try {
        const refreshRes = await fetch(`${getBaseUrl()}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
            headers.set('Authorization', `Bearer ${refreshData.data.accessToken}`);
            // Retry initial request
            response = await fetch(url, { ...options, headers });
          }
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      }
    }
  }

  let payload: ApiResponse<T>;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError('INTERNAL', `Layanan merespons kode HTTP ${response.status}`, response.status);
    }
    return {} as T;
  }

  if (!response.ok || payload.success === false) {
    const errObj = payload.error || {
      code: 'INTERNAL',
      message: 'Terjadi kesalahan sistem yang tidak diharapkan.',
    };
    throw new ApiError(errObj.code, errObj.message, response.status, errObj.requestId);
  }

  return payload.data;
}

export const api = {
  // Authentication & Session
  auth: {
    register: (name: string, email: string, password: string) =>
      request<{ user: any; accessToken: string; refreshToken: string }>(
        '/api/v1/auth/register',
        { method: 'POST', body: JSON.stringify({ name, email, password }) },
      ),
    login: (email: string, password: string) =>
      request<{ user: any; accessToken: string; refreshToken: string }>(
        '/api/v1/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>(
        '/api/v1/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
      ),
    logout: (refreshToken?: string) =>
      request<{ message: string }>(
        '/api/v1/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
      ),
  },

  // User Profile & Addresses
  user: {
    getProfile: () => request<any>('/api/v1/me'),
    updateProfile: (data: { name?: string }) =>
      request<any>('/api/v1/me', { method: 'PATCH', body: JSON.stringify(data) }),
    getAddresses: () => request<any[]>('/api/v1/me/addresses'),
    createAddress: (data: any) =>
      request<any>('/api/v1/me/addresses', { method: 'POST', body: JSON.stringify(data) }),
    updateAddress: (id: string, data: any) =>
      request<any>(`/api/v1/me/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAddress: (id: string) =>
      request<any>(`/api/v1/me/addresses/${id}`, { method: 'DELETE' }),
  },

  // Catalog
  catalog: {
    getProducts: (params?: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.set(k, String(v));
        });
      }
      return request<{ items: any[]; pagination: any }>(`/api/v1/products?${q.toString()}`);
    },
    getProduct: (slug: string) => request<any>(`/api/v1/products/${encodeURIComponent(slug)}`),
    getCategories: () => request<any[]>('/api/v1/categories'),
  },

  // Cart
  cart: {
    getCart: () => request<any>('/api/v1/cart'),
    addItem: (productId: string, quantity: number) =>
      request<any>('/api/v1/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      }),
    updateItem: (itemId: string, quantity: number) =>
      request<any>(`/api/v1/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    removeItem: (itemId: string) =>
      request<any>(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' }),
    checkout: () => request<any>('/api/v1/checkout', { method: 'POST' }),
  },

  // Orders
  orders: {
    create: (data: { items: { productId: string; quantity: number }[]; shippingAddressJson?: string }) =>
      request<any>('/api/v1/orders', { method: 'POST', body: JSON.stringify(data) }),
    list: (queryUserId?: string) => {
      const q = queryUserId ? `?userId=${encodeURIComponent(queryUserId)}` : '';
      return request<any[]>(`/api/v1/orders${q}`);
    },
    get: (orderNumber: string) => request<any>(`/api/v1/orders/${encodeURIComponent(orderNumber)}`),
    getHistory: (orderNumber: string) =>
      request<any[]>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/history`),
    cancel: (orderNumber: string, reason?: string) =>
      request<any>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Pembatalan oleh pelanggan' }),
      }),
    transitionStatus: (orderNumber: string, status: string, reason?: string) =>
      request<any>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason: reason || 'Perubahan status oleh admin' }),
      }),
  },

  // Payments
  payments: {
    create: (orderNumber: string) =>
      request<any>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/payments`, { method: 'POST' }),
    get: (paymentId: string) => request<any>(`/api/v1/payments/${encodeURIComponent(paymentId)}`),
    simulateSuccess: (paymentId: string) =>
      request<any>(`/api/v1/payments/${encodeURIComponent(paymentId)}/simulate-success`, {
        method: 'POST',
      }),
  },

  // Notifications
  notifications: {
    list: () => request<any[]>('/api/v1/notifications'),
    listAdmin: (status?: string, page = 1, limit = 20) => {
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) q.set('status', status);
      return request<{ items?: any[]; data?: any[]; pagination: any }>(`/api/v1/admin/notifications?${q.toString()}`);
    },
    send: (data: any) =>
      request<any>('/api/v1/notifications', { method: 'POST', body: JSON.stringify(data) }),
  },

  // AI Assistant
  ai: {
    chat: (message: string, orderNumber?: string) =>
      request<{ answer: string; tools_used: string[]; sources: string[] }>(
        '/api/v1/assistant/chat',
        { method: 'POST', body: JSON.stringify({ message, order_number: orderNumber }) },
      ),
    createTicket: (data: { subject: string; description: string; order_number?: string }) =>
      request<any>('/api/v1/assistant/tickets', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Admin Catalog & Inventory
  admin: {
    createProduct: (data: any) =>
      request<any>('/api/v1/admin/products', { method: 'POST', body: JSON.stringify(data) }),
    getProduct: (id: string) => request<any>(`/api/v1/admin/products/${id}`),
    updateProduct: (id: string, data: any) =>
      request<any>(`/api/v1/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    archiveProduct: (id: string) =>
      request<any>(`/api/v1/admin/products/${id}`, { method: 'DELETE' }),
    adjustInventory: (productId: string, quantityDelta: number) =>
      request<any>(`/api/v1/admin/inventory/${productId}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ quantityDelta }),
      }),
    createCategory: (data: any) =>
      request<any>('/api/v1/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: string, data: any) =>
      request<any>(`/api/v1/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    archiveCategory: (id: string) =>
      request<any>(`/api/v1/admin/categories/${id}`, { method: 'DELETE' }),
  },
};

