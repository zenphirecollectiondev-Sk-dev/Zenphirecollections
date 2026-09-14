import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { useWishlistStore } from './useWishlistStore';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  role: 'customer' | 'admin';
  created_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialize: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[Auth] Session initialization failed.');
      }

      if (session) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          console.error('[Auth] Profile fetch failed.');
        }
        set({ session, user: session.user, profile: profile as Profile || null, loading: false });
        useWishlistStore.getState().fetchWishlist(session.user.id);
      } else {
        set({ session: null, user: null, profile: null, loading: false });
        useWishlistStore.getState().clearWishlist();
      }

      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            console.error('[Auth] Profile refresh failed on auth event:', event);
          }
          set({ session, user: session.user, profile: profile as Profile || null, loading: false });
          useWishlistStore.getState().fetchWishlist(session.user.id);
        } else {
          set({ session: null, user: null, profile: null, loading: false });
          useWishlistStore.getState().clearWishlist();
        }
      });
    } catch (error) {
      console.error('[Auth] Unexpected error during initialization.');
      set({ loading: false });
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
      useWishlistStore.getState().clearWishlist();
    } catch (error) {
      console.error('[Auth] Sign out failed.');
    }
  },
  updateProfile: (profileData) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...profileData } : null
  }))
}));

