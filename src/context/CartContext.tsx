import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Product, Sale } from '../types/db';
import { calculateCartTotals, CartTotals } from '../utils/calculations';

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent?: number;
  customPriceOverride?: number;
}

export interface CartContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addItem: (product: Product, qty?: number, maxStock?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, newQty: number, maxStock?: number) => void;
  setDiscount: (productId: string, discountPercent: number) => void;
  setPriceOverride: (productId: string, customPrice: number) => void;
  clearCart: () => void;
  totals: CartTotals;
  calculationError: string | null;
  overallDiscountPercent: number;
  setOverallDiscountPercent: (pct: number) => void;
  overallDiscountAmount: number;
  setOverallDiscountAmount: (amt: number) => void;
  parkedSales: Sale[];
  setParkedSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  holdSale: (sale: Sale) => void;
  resumeSale: (saleId: string) => Sale | null;
}

const EMPTY_CART_TOTALS: CartTotals = {
  subtotal: 0,
  lineDiscountTotal: 0,
  overallDiscountTotal: 0,
  discountTotal: 0,
  vatableSales: 0,
  vatAmount: 0,
  vatExemptSales: 0,
  grandTotal: 0,
  itemCount: 0,
  totalUnits: 0,
  subtotalCentavos: 0,
  discountTotalCentavos: 0,
  vatableSalesCentavos: 0,
  vatAmountCentavos: 0,
  vatExemptSalesCentavos: 0,
  grandTotalCentavos: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('tp_active_pos_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number>(0);

  const [parkedSales, setParkedSales] = useState<Sale[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('tp_parked_sales');
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate totals in pure integer centavos using calculations utility
  const { totals, calculationError } = useMemo(() => {
    try {
      const computed = calculateCartTotals(cart, overallDiscountPercent, overallDiscountAmount);
      return { totals: computed, calculationError: null };
    } catch (err: any) {
      return {
        totals: EMPTY_CART_TOTALS,
        calculationError: err.message || 'Cart calculation error',
      };
    }
  }, [cart, overallDiscountPercent, overallDiscountAmount]);

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
      }

      if (maxStock !== undefined && qty > maxStock) {
        addedSuccessfully = false;
        return prev;
      }

      return [...prev, { product, quantity: qty }];
    });

    return addedSuccessfully;
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, newQty: number, maxStock?: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const clampedQty = maxStock !== undefined ? Math.min(newQty, maxStock) : newQty;
            return { ...item, quantity: Math.max(0, clampedQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

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
    localStorage.removeItem('tp_active_pos_cart');
  }, []);

  const holdSale = useCallback((sale: Sale) => {
    setParkedSales((prev) => {
      const updated = [...prev, sale];
      localStorage.setItem('tp_parked_sales', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resumeSale = useCallback((saleId: string): Sale | null => {
    let resumed: Sale | null = null;
    setParkedSales((prev) => {
      const found = prev.find((s) => s.id === saleId);
      if (found) {
        resumed = found;
        const updated = prev.filter((s) => s.id !== saleId);
        localStorage.setItem('tp_parked_sales', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
    return resumed;
  }, []);

  const value = useMemo<CartContextType>(() => ({
    cart,
    setCart,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    setPriceOverride,
    clearCart,
    totals,
    calculationError,
    overallDiscountPercent,
    setOverallDiscountPercent,
    overallDiscountAmount,
    setOverallDiscountAmount,
    parkedSales,
    setParkedSales,
    holdSale,
    resumeSale,
  }), [
    cart,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    setPriceOverride,
    clearCart,
    totals,
    calculationError,
    overallDiscountPercent,
    overallDiscountAmount,
    parkedSales,
    holdSale,
    resumeSale,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const usePosCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('usePosCart must be used within a CartProvider');
  }
  return context;
};
