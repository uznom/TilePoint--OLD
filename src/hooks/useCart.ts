import { useState, useCallback, useMemo } from 'react';
import { Product } from '../types/db';
import { calculateCartTotals, CartTotals } from '../utils/calculations';

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent?: number;
  customPriceOverride?: number;
}

export interface UseCartReturn {
  cart: CartItem[];
  addItem: (product: Product, qty?: number, maxStock?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, newQty: number, maxStock?: number) => void;
  setDiscount: (productId: string, discountPercent: number) => void;
  setPriceOverride: (productId: string, customPrice: number) => void;
  clearCart: () => void;
  totals: CartTotals;
  overallDiscountPercent: number;
  setOverallDiscountPercent: (pct: number) => void;
  overallDiscountAmount: number;
  setOverallDiscountAmount: (amt: number) => void;
}

/**
 * Custom hook to isolate interactive cart state management and calculations.
 */
export function useCart(initialItems: CartItem[] = []): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>(initialItems);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number>(0);

  const addItem = useCallback((product: Product, qty: number = 1, maxStock?: number) => {
    let addedSuccessfully = true;

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const existingQty = prev[idx].quantity;
        const targetQty = existingQty + qty;

        if (maxStock !== undefined && targetQty > maxStock) {
          addedSuccessfully = false;
          return prev;
        }

        const next = [...prev];
        next[idx] = { ...next[idx], quantity: targetQty };
        return next;
      } else {
        if (maxStock !== undefined && qty > maxStock) {
          addedSuccessfully = false;
          return prev;
        }
        return [...prev, { product, quantity: qty }];
      }
    });

    return addedSuccessfully;
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, newQty: number, maxStock?: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const validQty = maxStock !== undefined ? Math.min(newQty, maxStock) : newQty;
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  }, [removeItem]);

  const setDiscount = useCallback((productId: string, discountPercent: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, discountPercent: Math.max(0, Math.min(100, discountPercent)) };
        }
        return item;
      })
    );
  }, []);

  const setPriceOverride = useCallback((productId: string, customPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, customPriceOverride: Math.max(0, customPrice) };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setOverallDiscountPercent(0);
    setOverallDiscountAmount(0);
  }, []);

  const totals = useMemo(() => {
    return calculateCartTotals(cart, overallDiscountPercent, overallDiscountAmount);
  }, [cart, overallDiscountPercent, overallDiscountAmount]);

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    setPriceOverride,
    clearCart,
    totals,
    overallDiscountPercent,
    setOverallDiscountPercent,
    overallDiscountAmount,
    setOverallDiscountAmount,
  };
}
