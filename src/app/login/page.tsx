'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Pemetaan username ke email internal Supabase
    const email = username === 'admin' ? 'admin@ninecoffee.local' : username;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Username atau password salah.');
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cream">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-latte">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-espresso rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Coffee className="text-caramel w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-espresso">Nine Coffee</h1>
          <p className="text-mocha opacity-60 mt-2">Dashboard Admin Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-mocha mb-2 flex items-center gap-2">
              <User size={16} /> Username
            </label>
            <input
              type="text"
              className="w-full bg-cream border border-latte rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-caramel/20 transition-all"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-mocha mb-2 flex items-center gap-2">
              <Lock size={16} /> Password
            </label>
            <input
              type="password"
              className="w-full bg-cream border border-latte rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-caramel/20 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 animate-shake">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-leaf text-parchment py-3 rounded-xl flex items-center justify-center gap-2 text-lg font-bold hover:bg-leaf/90 transition-all shadow-lg shadow-leaf/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Masuk Ke Dashboard'
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-mocha opacity-40 mt-8 tracking-widest uppercase font-bold">
          &copy; 2026 Nine Coffee System
        </p>
      </div>
    </div>
  );
}
