'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud, RotateCw, CheckCircle2, AlertTriangle, X,
  ExternalLink, Link as LinkIcon, Unlink,
} from 'lucide-react';

interface Props {
  domainId: string;
  domainName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CFStatus {
  connected: boolean;
  accountEmail?: string;
  lastSyncAt?: string;
  tokenExpired?: boolean;
}

export default function CloudflareSyncModal({ domainId, domainName, isOpen, onClose, onSuccess }: Props) {
  const [cfStatus, setCfStatus] = useState<CFStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Token connect state
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load CF connection status on open
  useEffect(() => {
    if (!isOpen) return;
    setSyncResult(null);
    setSyncError(null);
    setConnectError(null);
    setTokenInput('');
    setStatusLoading(true);
    fetch('/api/auth/cloudflare/status')
      .then(r => r.json())
      .then(d => setCfStatus(d))
      .catch(() => setCfStatus({ connected: false }))
      .finally(() => setStatusLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Connect: save a new API token ────────────────────────────────────────
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      // Save token by running a sync — the sync route saves it automatically
      const res = await fetch(`/api/domains/${domainId}/cloudflare-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      // Connected! refresh status
      setCfStatus({ connected: true, accountEmail: undefined, lastSyncAt: new Date().toISOString() });
      setSyncResult(data.syncResult);
      setTokenInput('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  // ── Sync: already connected, just sync ───────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/domains/${domainId}/cloudflare-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data.syncResult);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm('Disconnect Cloudflare? You can reconnect anytime.')) return;
    await fetch('/api/auth/cloudflare/status', { method: 'DELETE' });
    setCfStatus({ connected: false });
    setSyncResult(null);
    setSyncError(null);
  };

  const isConnected = cfStatus?.connected && !cfStatus?.tokenExpired;

  // Cloudflare token creation deep link — pre-selects Zone DNS Edit permission
  const cfTokenCreateUrl =
    'https://dash.cloudflare.com/profile/api-tokens/create?permissionGroupKeys[]=dns_records:edit&permissionGroupKeys[]=zone:read&name=Azion+Mail';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl max-w-lg w-full p-6 relative shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cloudflare DNS Sync</h3>
              <p className="text-xs text-dark-muted">{domainName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-surface text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading status */}
        {statusLoading ? (
          <div className="py-10 flex justify-center">
            <RotateCw className="h-5 w-5 animate-spin text-orange-400" />
          </div>
        ) : isConnected ? (
          /* ── CONNECTED STATE ────────────────────────────────────────── */
          <div className="mt-5 space-y-4">
            {/* Connection badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Cloudflare Connected</p>
                  {cfStatus?.accountEmail && (
                    <p className="text-[11px] text-emerald-400/70">{cfStatus.accountEmail}</p>
                  )}
                  {cfStatus?.lastSyncAt && (
                    <p className="text-[11px] text-slate-500">
                      Last synced: {new Date(cfStatus.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
              >
                <Unlink className="h-3 w-3" />
                Disconnect
              </button>
            </div>

            {/* What will be synced */}
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300 mb-1.5">Records that will be provisioned / repaired:</p>
              {['MX — Mail routing', 'A — mail.domain.com → your VPS IP', 'TXT — SPF (v=spf1 ...)', 'TXT — DKIM public key', 'TXT — DMARC policy', 'SRV — Autoconfig for email clients'].map(r => (
                <div key={r} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>

            {/* Sync result */}
            {syncResult && (
              <div className="p-3 rounded-xl bg-dark-surface border border-dark-border text-xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  DNS Sync Complete!
                </div>
                <div className="text-slate-300">Created: <span className="text-emerald-400 font-semibold">{syncResult.created?.length ?? 0}</span> records</div>
                <div className="text-slate-300">Repaired: <span className="text-amber-400 font-semibold">{syncResult.updated?.length ?? 0}</span> records</div>
                <div className="text-slate-300">Unchanged: <span className="text-slate-400 font-semibold">{syncResult.unchanged?.length ?? 0}</span> records</div>
                {syncResult.errors?.length > 0 && (
                  <div className="text-rose-400">Errors: {syncResult.errors.join(', ')}</div>
                )}
              </div>
            )}

            {syncError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all cursor-pointer">
                Close
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
              >
                {syncing ? <><RotateCw className="h-3.5 w-3.5 animate-spin" /><span>Syncing...</span></> : <><Cloud className="h-3.5 w-3.5" /><span>Sync DNS Now</span></>}
              </button>
            </div>
          </div>
        ) : (
          /* ── NOT CONNECTED STATE ────────────────────────────────────── */
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-400">
              Connect once — all future DNS syncs are 1-click. Azion Mail will automatically create and repair
              your MX, SPF, DKIM, DMARC, and autoconfig records.
            </p>

            {/* Step 1: Create token on Cloudflare */}
            <div className="p-4 rounded-xl bg-dark-surface border border-dark-border space-y-3">
              <p className="text-xs font-semibold text-white">Step 1 — Create a Cloudflare token</p>
              <p className="text-[11px] text-slate-400">
                Click the button below to open Cloudflare. Select <strong className="text-slate-300">All zones</strong>,
                set permission to <strong className="text-slate-300">Zone → DNS → Edit</strong>, then click
                <strong className="text-slate-300"> Continue to summary → Create Token</strong> and copy the token.
              </p>
              <a
                href={cfTokenCreateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#F48120] hover:bg-[#F06000] transition-all shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Cloud className="h-3.5 w-3.5" />
                Create Token on Cloudflare
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </div>

            {/* Step 2: Paste token */}
            <form onSubmit={handleConnect} className="p-4 rounded-xl bg-dark-surface border border-dark-border space-y-3">
              <p className="text-xs font-semibold text-white">Step 2 — Paste your token here</p>
              <input
                type="password"
                required
                autoComplete="off"
                placeholder="Paste Cloudflare API Token"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-card border border-dark-border text-sm text-white focus:outline-none focus:border-orange-500 font-mono text-xs"
              />
              {connectError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-card transition-all cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting || !tokenInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {connecting ? <><RotateCw className="h-3.5 w-3.5 animate-spin" /><span>Connecting & Syncing...</span></> : <><LinkIcon className="h-3.5 w-3.5" /><span>Connect & Sync DNS</span></>}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
