import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface WishlistState {
  productIds: string[];
  loading: boolean;
  fetchWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: [],
  loading: false,
  fetchWishlist: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      set({ productIds: (data || []).map((item) => item.product_id), loading: false });
    } catch (err) {
      console.error('[Wishlist] Error fetching wishlist items:', err);
      set({ loading: false });
    }
  },
  toggleWishlist: async (productId) => {
    const { productIds } = get();
    const exists = productIds.includes(productId);
    
    // Retrieve logged-in user state directly from useAuthStore
    const user = useAuthStore.getState().user;
    const userId = user?.id;

    // Optimistic update of local state for instant responsiveness
    if (exists) {
      set({ productIds: productIds.filter((id) => id !== productId) });
    } else {
      set({ productIds: [...productIds, productId] });
    }

    // Sync with Supabase in background if user is authenticated
    if (userId) {
      try {
        if (exists) {
          const { error } = await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('wishlist_items')
            .insert({ user_id: userId, product_id: productId });
          if (error) throw error;
        }
      } catch (err) {
        console.error('[Wishlist] Error syncing with database:', err);
        // Rollback state if database transaction fails
        if (exists) {
          set({ productIds: [...get().productIds, productId] });
        } else {
          set({ productIds: get().productIds.filter((id) => id !== productId) });
        }
      }
    }
  },
  isWishlisted: (productId) => get().productIds.includes(productId),
  clearWishlist: () => set({ productIds: [] })
}));
