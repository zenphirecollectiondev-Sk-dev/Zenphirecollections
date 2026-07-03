import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

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
      const isCallback = window.location.hash.includes('access_token=') || 
                         window.location.hash.includes('id_token=') ||
                         window.location.search.includes('code=');

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        set({ session, user: session.user, profile: profile as Profile || null, loading: false });
      } else {
        if (!isCallback) {
          set({ session: null, user: null, profile: null, loading: false });
        }
      }

      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          set({ session, user: session.user, profile: profile as Profile || null, loading: false });
        } else {
          set({ session: null, user: null, profile: null, loading: false });
        }
      });
    } catch (error) {
      console.error('Error initializing auth store:', error);
      set({ loading: false });
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
  updateProfile: (profileData) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...profileData } : null
  }))
}));
