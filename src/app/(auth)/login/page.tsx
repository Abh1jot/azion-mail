'use client';

import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, RotateCw, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: requires2FA ? twoFactorCode : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-azion-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-card rounded-3xl p-8 sm:p-10 max-w-md w-full relative z-10 border border-dark-border shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-azion-600 to-indigo-500 mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-azion-500/30 mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Azion Mail</h1>
          <p className="text-xs text-dark-muted mt-1">Enterprise Self-Hosted Email Hosting Platform</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requires2FA ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-dark-muted" />
                  <input
                    type="email"
                    required
                    placeholder="admin@azioncloud.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-dark-muted" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500 transition-colors"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="text-center mb-4">
                <ShieldCheck className="h-8 w-8 text-azion-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-dark-muted mt-0.5">Enter the 6-digit code from your authenticator app</p>
              </div>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 rounded-xl bg-dark-surface border border-azion-500 text-white focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-azion-600 to-indigo-600 hover:from-azion-500 hover:to-indigo-500 transition-all shadow-lg shadow-azion-500/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RotateCw className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                <span>{requires2FA ? 'Verify 2FA' : 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-dark-border text-center text-xs text-dark-muted">
          Powered by <span className="font-semibold text-azion-400">Azion Cloud</span> Infrastructure
        </div>
      </div>
    </div>
  );
}
