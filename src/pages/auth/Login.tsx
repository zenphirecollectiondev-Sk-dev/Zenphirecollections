import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertCircle } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuthStore();

  // If already logged in, redirect away
  React.useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Find where the user originally wanted to go
      const from = (location.state as any)?.from?.pathname || '/';
      // Route them through our onboarding path first
      const redirectUrl = `${window.location.origin}/onboarding?redirect=${encodeURIComponent(from)}`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-12 bg-bg">
      <div className="w-full max-w-md bg-white border border-border p-8 md:p-10 shadow-sm">
        <div className="text-center mb-8 space-y-2">
          <span className="text-[10px] uppercase tracking-widest bg-bg-subtle border border-border text-text-secondary font-black px-2.5 py-1">
            Access Portal
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-wide uppercase mt-2">
            Sign In
          </h1>
          <p className="text-xs text-text-secondary">
            Join the Zenphire Collections minimal wardrobe portal.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-sale/10 border border-sale text-sale text-xs flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            We use secure Google authentication. New users will be prompted to fill in additional details (Name, DOB, Gender) after sign-in.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full border border-border bg-white text-text-primary py-4 font-bold uppercase text-xs tracking-widest hover:bg-bg-subtle transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.01 2.46l3.09 2.39c1.8-1.66 2.88-4.11 2.88-6.7z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.09-2.39c-.9.6-2.06.96-3.27.96-3.13 0-5.78-2.11-6.73-4.96L3.69 17.6C5.66 21.4 9.62 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.7c-.25-.7-.39-1.46-.39-2.25s.14-1.55.39-2.25L1.51 7.23C.54 9.17 0 11.27 0 12.5s.54 3.33 1.51 5.27l3.76-3.07z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 9.62 0 5.66 2.6 3.69 6.4l3.76 2.92C8.4 6.86 11.05 4.75 12 4.75z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
