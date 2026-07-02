import { create } from 'zustand';

interface WishlistState {
  productIds: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: [],
  toggleWishlist: (productId) => set((state) => {
    const exists = state.productIds.includes(productId);
    if (exists) {
      return { productIds: state.productIds.filter((id) => id !== productId) };
    }
    return { productIds: [...state.productIds, productId] };
  }),
  isWishlisted: (productId) => get().productIds.includes(productId),
  clearWishlist: () => set({ productIds: [] })
}));
