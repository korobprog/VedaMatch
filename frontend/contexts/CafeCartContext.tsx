import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    Cart,
    CartItem,
    Dish,
    DishModifier,
    SelectedModifier,
    CafeOrderType,
} from '../types/cafe';

interface CafeCartContextType {
    cart: Cart | null;
    initCart: (cafeId: number, cafeName: string, tableId?: number, tableNumber?: string, orderType?: CafeOrderType) => void;
    addToCart: (dish: Dish, quantity: number, removedIngredients: string[], selectedModifiers: SelectedModifier[], note: string, cafeId?: number, cafeName?: string) => void;
    updateQuantity: (dishId: number, quantity: number) => void;
    removeFromCart: (dishId: number) => void;
    clearCart: () => void;
    setOrderType: (orderType: CafeOrderType) => void;
    setTableInfo: (tableId: number, tableNumber: string) => void;
    setDeliveryFee: (fee: number) => void;
    getItemCount: () => number;
}

const CafeCartContext = createContext<CafeCartContextType | undefined>(undefined);

interface CafeCartProviderProps {
    children: ReactNode;
}

export const CafeCartProvider: React.FC<CafeCartProviderProps> = ({ children }) => {
    const [cart, setCart] = useState<Cart | null>(null);

    const calculateItemTotal = (dish: Dish, quantity: number, modifiers: SelectedModifier[]): number => {
        let total = dish.price * quantity;
        modifiers.forEach(mod => {
            total += mod.modifier.price * mod.quantity;
        });
        return total;
    };

    const recalculateCart = (items: CartItem[], deliveryFee: number): { subtotal: number; total: number } => {
        const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
        return {
            subtotal,
            total: subtotal + deliveryFee,
        };
    };

    const initCart = useCallback((
        cafeId: number,
        cafeName: string,
        tableId?: number,
        tableNumber?: string,
        orderType?: CafeOrderType
    ) => {
        setCart(prevCart => {
            const finalOrderType = orderType || (tableId ? 'dine_in' : 'takeaway');

            // Check if cart is for different cafe
            if (prevCart && prevCart.cafeId !== cafeId) {
                return {
                    cafeId,
                    cafeName,
                    items: [],
                    tableId,
                    tableNumber,
                    orderType: finalOrderType,
                    subtotal: 0,
                    deliveryFee: 0,
                    total: 0,
                };
            } else if (!prevCart) {
                return {
                    cafeId,
                    cafeName,
                    items: [],
                    tableId,
                    tableNumber,
                    orderType: finalOrderType,
                    subtotal: 0,
                    deliveryFee: 0,
                    total: 0,
                };
            } else {
                // Update table info if provided
                if (tableId && tableNumber) {
                    return { ...prevCart, tableId, tableNumber, orderType: orderType || 'dine_in' };
                }
                return prevCart;
            }
        });
    }, []);

    const addToCart = useCallback((
        dish: Dish,
        quantity: number,
        removedIngredients: string[],
        selectedModifiers: SelectedModifier[],
        note: string,
        cafeId?: number,
        cafeName?: string
    ) => {
        setCart(prevCart => {
            let currentCart = prevCart;

            // If no cart or wrong cafe, initialize it automatically
            if (!currentCart || (cafeId && currentCart.cafeId !== cafeId)) {
                if (!cafeId && !currentCart) return null;

                if (cafeId && (!currentCart || currentCart.cafeId !== cafeId)) {
                    currentCart = {
                        cafeId,
                        cafeName: cafeName || 'Cafe',
                        items: [],
                        subtotal: 0,
                        deliveryFee: 0,
                        total: 0,
                        orderType: 'takeaway',
                    };
                }
            }

            if (!currentCart) return null;

            const itemTotal = calculateItemTotal(dish, quantity, selectedModifiers);
            const newItem: CartItem = {
                dish,
                quantity,
                removedIngredients,
                selectedModifiers,
                note,
                itemTotal,
            };

            // Check if same dish with same customization exists
            const existingIndex = currentCart.items.findIndex(item =>
                item.dish.id === dish.id &&
                JSON.stringify(item.removedIngredients) === JSON.stringify(removedIngredients) &&
                JSON.stringify(item.selectedModifiers.map(m => m.modifier.id)) ===
                JSON.stringify(selectedModifiers.map(m => m.modifier.id))
            );

            let newItems: CartItem[];
            if (existingIndex >= 0) {
                // Update existing item quantity
                newItems = [...currentCart.items];
                const existing = newItems[existingIndex];
                const newQuantity = existing.quantity + quantity;
                newItems[existingIndex] = {
                    ...existing,
                    quantity: newQuantity,
                    itemTotal: calculateItemTotal(existing.dish, newQuantity, existing.selectedModifiers),
                };
            } else {
                newItems = [...currentCart.items, newItem];
            }

            const { subtotal, total } = recalculateCart(newItems, currentCart.deliveryFee);

            return {
                ...currentCart,
                items: newItems,
                subtotal,
                total,
            };
        });
    }, []);

    const updateQuantity = useCallback((dishId: number, quantity: number) => {
        setCart(prevCart => {
            if (!prevCart) return null;

            if (quantity <= 0) {
                const newItems = prevCart.items.filter(item => item.dish.id !== dishId);
                const { subtotal, total } = recalculateCart(newItems, prevCart.deliveryFee);

                if (newItems.length === 0) return null;

                return {
                    ...prevCart,
                    items: newItems,
                    subtotal,
                    total,
                };
            }

            const newItems = prevCart.items.map(item => {
                if (item.dish.id === dishId) {
                    return {
                        ...item,
                        quantity,
                        itemTotal: calculateItemTotal(item.dish, quantity, item.selectedModifiers),
                    };
                }
                return item;
            });

            const { subtotal, total } = recalculateCart(newItems, prevCart.deliveryFee);

            return {
                ...prevCart,
                items: newItems,
                subtotal,
                total,
            };
        });
    }, []);

    const removeFromCart = useCallback((dishId: number) => {
        setCart(prevCart => {
            if (!prevCart) return null;

            const newItems = prevCart.items.filter(item => item.dish.id !== dishId);
            const { subtotal, total } = recalculateCart(newItems, prevCart.deliveryFee);

            if (newItems.length === 0) return null;

            return {
                ...prevCart,
                items: newItems,
                subtotal,
                total,
            };
        });
    }, []);

    const clearCart = useCallback(() => {
        setCart(null);
    }, []);

    const setOrderType = useCallback((orderType: CafeOrderType) => {
        setCart(prevCart => prevCart ? { ...prevCart, orderType } : null);
    }, []);

    const setTableInfo = useCallback((tableId: number, tableNumber: string) => {
        setCart(prevCart => prevCart ? { ...prevCart, tableId, tableNumber } : null);
    }, []);

    const setDeliveryFee = useCallback((fee: number) => {
        setCart(prevCart => {
            if (!prevCart) return null;
            const total = prevCart.subtotal + fee;
            return { ...prevCart, deliveryFee: fee, total };
        });
    }, []);

    const getItemCount = useCallback(() => {
        if (!cart) return 0;
        return cart.items.reduce((count, item) => count + item.quantity, 0);
    }, [cart]);

    return (
        <CafeCartContext.Provider
            value={{
                cart,
                initCart,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart,
                setOrderType,
                setTableInfo,
                setDeliveryFee,
                getItemCount,
            }}
        >
            {children}
        </CafeCartContext.Provider>
    );
};

export const useCart = (): CafeCartContextType => {
    const context = useContext(CafeCartContext);
    if (!context) {
        throw new Error('useCart must be used within a CafeCartProvider');
    }
    return context;
};

export default CafeCartContext;
