import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../types';

const CART_KEY = 'atelier-cart-v1';

interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (product: Product, variantId: string | null, quantity: number) => void;
  update: (productId: string, variantId: string | null, quantity: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: CartItem, productId: string, variantId: string | null) {
  return a.productId === productId && (a.variantId ?? null) === (variantId ?? null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      add: (product, variantId, quantity) => {
        setItems((current) => {
          const existing = current.find((item) => sameLine(item, product.id, variantId));
          if (existing) {
            return current.map((item) =>
              sameLine(item, product.id, variantId)
                ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
                : item
            );
          }
          return [...current, { productId: product.id, variantId, quantity }];
        });
      },
      update: (productId, variantId, quantity) => {
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => !sameLine(item, productId, variantId))
            : current.map((item) => (sameLine(item, productId, variantId) ? { ...item, quantity } : item))
        );
      },
      remove: (productId, variantId) => setItems((current) => current.filter((item) => !sameLine(item, productId, variantId))),
      clear: () => setItems([])
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
