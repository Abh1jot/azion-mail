'use client';

import React, { useEffect, useState } from 'react';
import { Shield, KeyRound, Lock, RotateCw, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 2FA Setup State
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaMsg, setTwoFaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API Key Generation State
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const initiate2FASetup = async () => {
    setTwoFaLoading(true);
    setTwoFaMsg(null);
    try {
      const res = await fetch('/api/auth/2fa');
      const data = await res.json();
      setQrCodeUrl(data.qrCodeDataUrl);
      setTwoFactorSecret(data.secret);
    } catch (err: any) {
      setTwoFaMsg({ type: 'error', text: err.message });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const confirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaLoading(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: twoFactorSecret,
          token: twoFactorToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '2FA confirmation failed');

      setBackupCodes(data.backupCodes || []);
      setTwoFaMsg({ type: 'success', text: 'Two-Factor Authentication is now enabled!' });
      setUser((prev: any) => ({ ...prev, twoFactorEnabled: true }));
      setQrCodeUrl(null);
    } catch (err: any) {
      setTwoFaMsg({ type: 'error', text: err.message });
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security & Account Settings</h1>
        <p className="text-xs text-dark-muted mt-0.5">
          Protect your Azion Mail account with Two-Factor Authentication (2FA) and manage programmatic API keys.
        </p>
      </div>

      {/* 2FA Security Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-dark-border space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-azion-600/15 border border-azion-500/30 flex items-center justify-center text-azion-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Two-Factor Authentication (2FA)</h3>
              <p className="text-xs text-dark-muted">
                Requires a one-time TOTP security code from Google Authenticator, Authy, or 1Password at login.
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
              user?.twoFactorEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-dark-surface text-slate-400 border border-dark-border'
            }`}
          >
            {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {twoFaMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              twoFaMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
            }`}
          >
            {twoFaMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{twoFaMsg.text}</span>
          </div>
        )}

        {/* 2FA Activation Flow */}
        {!user?.twoFactorEnabled && !qrCodeUrl && (
          <button
            onClick={initiate2FASetup}
            disabled={twoFaLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all cursor-pointer"
          >
            {twoFaLoading ? 'Generating QR...' : 'Enable 2FA Protection'}
          </button>
        )}

        {qrCodeUrl && (
          <form onSubmit={confirm2FA} className="p-6 rounded-2xl bg-dark-surface border border-dark-border space-y-4 max-w-md">
            <div className="text-center space-y-3">
              <div className="bg-white p-3 rounded-xl inline-block">
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44 mx-auto" />
              </div>
              <p className="text-xs text-slate-300">
                Scan this QR code with your authenticator app, then enter the 6-digit verification code below:
              </p>
            </div>

            <div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 rounded-xl bg-dark-bg border border-azion-500 text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={twoFaLoading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer"
            >
              {twoFaLoading ? 'Verifying...' : 'Verify and Activate 2FA'}
            </button>
          </form>
        )}

        {backupCodes.length > 0 && (
          <div className="p-5 rounded-2xl bg-dark-surface border border-emerald-500/30 space-y-2">
            <div className="text-xs font-bold text-emerald-400">Save Your Emergency Backup Codes:</div>
            <p className="text-[11px] text-dark-muted">
              Store these one-time codes in a secure location. You can use them if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="p-2 rounded bg-dark-bg text-center font-mono text-xs text-white border border-dark-border">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
