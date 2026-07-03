import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { ArrowRight, User, Calendar, Smile, AlertCircle } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile, loading: authLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectPath = searchParams.get('redirect') || '/';

  // Handle redirect if not logged in after auth initialization finishes
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Pre-fill user's name from auth metadata
  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    } else if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    } else if (user?.user_metadata?.name) {
      setName(user.user_metadata.name);
    }
  }, [user, profile]);

  // If already onboarded, send them on their way
  useEffect(() => {
    if (!authLoading && profile?.dob && profile?.gender) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, profile, navigate, redirectPath]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs tracking-widest text-text-secondary uppercase">Initializing Session</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob || !gender) {
      setError('Please fill in all profile fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!user) throw new Error('No active user session found.');

      // Update in Supabase profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          dob,
          gender
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update locally in Zustand store
      updateProfile({
        name: name.trim(),
        dob,
        gender
      });

      // Redirect user to destination
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-bg">
      <div className="w-full max-w-md bg-white border border-border p-8 shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <span className="text-[10px] uppercase tracking-widest bg-bg-subtle border border-border text-text-secondary font-black px-2.5 py-1">
            First-Time Setup
          </span>
          <h1 className="text-2xl font-heading font-black uppercase text-text-primary mt-2">
            Complete Your Profile
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            Please fill out these details to customize your Zenphire experience.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-sale/10 border border-sale text-sale text-xs flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2 flex items-center gap-1.5">
              <User size={13} className="text-text-secondary" /> Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2 flex items-center gap-1.5">
              <Calendar size={13} className="text-text-secondary" /> Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent cursor-pointer"
            />
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2 flex items-center gap-1.5">
              <Smile size={13} className="text-text-secondary" /> Gender
            </label>
            <select
              id="gender"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent cursor-pointer appearance-none uppercase font-semibold tracking-wider text-[11px] select-style"
            >
              <option value="">Select gender...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unisex">Unisex</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Saving details...' : 'Finish Setup'} <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
