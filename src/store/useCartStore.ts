import { create } from 'zustand';

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  size: string;
  color: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (newItem) => set((state) => {
    const existingIndex = state.items.findIndex(
      (item) => item.variantId === newItem.variantId
    );
    if (existingIndex > -1) {
      const updatedItems = [...state.items];
      updatedItems[existingIndex].quantity += 1;
      return { items: updatedItems };
    }
    return { items: [...state.items, { ...newItem, quantity: 1 }] };
  }),
  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((item) => item.id !== itemId)
  })),
  updateQuantity: (itemId, quantity) => set((state) => ({
    items: state.items.map((item) =>
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    )
  })),
  clearCart: () => set({ items: [] })
}));
