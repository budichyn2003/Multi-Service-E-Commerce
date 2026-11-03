'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from './api';
import { useAuth } from './auth-context';

export interface CartItem {
  id: string; // item id or product id
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  slug?: string;
  subtotal?: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  loading: boolean;
  addItem: (product: { id: string; name: string; price: number; slug?: string; sku?: string }, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

const GUEST_CART_KEY = 'marketforge_guest_cart';
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load guest cart from localStorage
  const loadGuestCart = (): CartItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveGuestCart = (newItems: CartItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newItems));
  };

  // Sync cart with backend if logged in
  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems(loadGuestCart());
      return;
    }

    setLoading(true);
    try {
      const res = await api.cart.getCart();
      if (res && Array.isArray(res.items)) {
        setItems(
          res.items.map((i: any) => ({
            id: i.id || i.itemId || i.productId,
            productId: i.productId || i.id,
            name: i.name || i.productName || 'Produk',
            price: Number(i.price) || 0,
            quantity: Number(i.quantity) || 1,
            sku: i.sku,
            slug: i.slug,
            subtotal: Number(i.subtotal) || Number(i.price) * Number(i.quantity),
          })),
        );
      } else {
        setItems([]);
      }
    } catch {
      // Fallback to guest cart if server fails or empty
      setItems(loadGuestCart());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (
    product: { id: string; name: string; price: number; slug?: string; sku?: string },
    quantity = 1,
  ) => {
    if (user) {
      try {
        await api.cart.addItem(product.id, quantity);
        await refreshCart();
        return;
      } catch (err) {
        console.warn('Gagal menambahkan item ke keranjang server, menyimpan lokal:', err);
      }
    }

    // Guest cart fallback
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      } else {
        updated = [
          ...prev,
          {
            id: product.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            sku: product.sku,
            slug: product.slug,
          },
        ];
      }
      saveGuestCart(updated);
      return updated;
    });
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    if (user) {
      try {
        await api.cart.updateItem(itemId, quantity);
        await refreshCart();
        return;
      } catch (err) {
        console.warn('Gagal mengubah kuantitas di server, memperbarui lokal:', err);
      }
    }

    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId || item.productId === itemId ? { ...item, quantity } : item,
      );
      saveGuestCart(updated);
      return updated;
    });
  };

  const removeItem = async (itemId: string) => {
    if (user) {
      try {
        await api.cart.removeItem(itemId);
        await refreshCart();
        return;
      } catch (err) {
        console.warn('Gagal menghapus item dari server, menghapus lokal:', err);
      }
    }

    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== itemId && item.productId !== itemId);
      saveGuestCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_CART_KEY);
    }
  };

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalAmount,
        loading,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

