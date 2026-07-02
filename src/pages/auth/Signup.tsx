import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function Signup() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
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
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
        },
      });

      if (signUpError) throw signUpError;

      setSuccess(true);
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to register account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-border p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-wide uppercase">
            Create Account
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Join Zenphire Collections today
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-sale/10 border border-sale text-sale text-sm rounded-none">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-bg-subtle border border-border text-text-primary text-sm rounded-none">
              Account created successfully! Please check your email inbox to verify your account before logging in.
            </div>
            <Link
              to="/login"
              className="inline-block bg-accent text-white px-6 py-3 font-medium uppercase text-sm tracking-wider hover:bg-accent-hover transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                disabled={loading}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent transition-colors"
                placeholder="+91 99999 99999"
              />
            </div>

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
              <label htmlFor="password" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent transition-colors"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent transition-colors"
                placeholder="Confirm password"
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
                'Create Account'
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-border text-center text-sm">
          <span className="text-text-secondary">Already have an account? </span>
          <Link
            to="/login"
            className="text-text-primary font-medium hover:underline underline-offset-4 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
