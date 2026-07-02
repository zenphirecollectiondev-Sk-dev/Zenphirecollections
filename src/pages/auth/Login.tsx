import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user) {
        // Fetch role to redirect correctly
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const from = (location.state as any)?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else if (profile?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-border p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-wide uppercase">
            Sign In
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Welcome back to Zenphire Collections
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-sale/10 border border-sale text-sale text-sm rounded-none">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent transition-colors"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-text-secondary hover:text-text-primary transition-colors underline underline-offset-4"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent transition-colors"
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-3 font-medium uppercase text-sm tracking-wider hover:bg-accent-hover transition-colors disabled:bg-text-secondary disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm">
          <span className="text-text-secondary">Don't have an account? </span>
          <Link
            to="/signup"
            className="text-text-primary font-medium hover:underline underline-offset-4 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
