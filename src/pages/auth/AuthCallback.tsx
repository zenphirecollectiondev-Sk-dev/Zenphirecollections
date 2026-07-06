import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';


  useEffect(() => {
    console.warn("[AuthCallback] URL query parameters:", window.location.search);
    console.warn("[AuthCallback] URL hash:", window.location.hash);

    // 5-second safety fallback: if OAuth processing fails or takes too long, redirect to login
    const timeoutId = setTimeout(() => {
      console.error("[AuthCallback] Timeout reached. Redirecting to login.");
      navigate('/login?error=Authentication%20failed%20or%20timed%20out.', { replace: true });
    }, 5000);

    // Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.warn("[AuthCallback] onAuthStateChange event:", event, "Session exists:", !!session);
      if (session) {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        
        // Wait a brief moment to ensure stores update before transitioning page
        setTimeout(() => {
          navigate(`/onboarding?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
        }, 100);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, redirectPath]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-bg">
      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin"></div>
      <p className="mt-4 text-xs tracking-widest text-text-secondary uppercase">Authenticating Portal</p>
    </div>
  );
}
