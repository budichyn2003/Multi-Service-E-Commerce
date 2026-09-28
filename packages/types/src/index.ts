/** Shared API contracts (mirror of API.md conventions). */

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
};

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  weightGrams?: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED';
