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
    console.warn("[Auth] Initializing store...");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("[Auth] getSession error:", sessionError);
      }

      if (session) {
        console.warn("[Auth] Session found for user:", session.user.email);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          console.error("[Auth] Profile fetch error:", profileError);
        }
        console.warn("[Auth] Profile loaded:", profile);
        set({ session, user: session.user, profile: profile as Profile || null, loading: false });
      } else {
        console.warn("[Auth] No initial session found.");
        set({ session: null, user: null, profile: null, loading: false });
      }

      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.warn("[Auth] onAuthStateChange event:", event, "Session exists:", !!session);
        if (session) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            console.error("[Auth] Profile select error on event:", profileError);
          }
          console.warn("[Auth] Profile updated on event:", profile);
          set({ session, user: session.user, profile: profile as Profile || null, loading: false });
        } else {
          set({ session: null, user: null, profile: null, loading: false });
        }
      });
    } catch (error) {
      console.error('[Auth] Error in initialize:', error);
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
