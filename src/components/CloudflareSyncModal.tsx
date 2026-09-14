'use client';

import React, { useState } from 'react';
import { Cloud, RotateCw, CheckCircle2, AlertTriangle, X, ShieldCheck } from 'lucide-react';

interface CloudflareSyncModalProps {
  domainId: string;
  domainName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CloudflareSyncModal({
  domainId,
  domainName,
  isOpen,
  onClose,
  onSuccess,
}: CloudflareSyncModalProps) {
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/domains/${domainId}/cloudflare-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: apiToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Cloudflare');

      setResult(data.syncResult);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl max-w-lg w-full p-6 relative shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">1-Click Cloudflare DNS Sync</h3>
              <p className="text-xs text-dark-muted">{domainName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-surface text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSync} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cloudflare API Token
            </label>
            <input
              type="password"
              placeholder="Paste Cloudflare API Token (Leave blank if already saved)"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500 font-mono text-xs"
            />
            <p className="text-[11px] text-dark-muted mt-1.5">
              Requires <strong>Zone:DNS:Edit</strong> permissions. Creates MX, SPF, DKIM, DMARC, and autoconfig records automatically with proxying disabled.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-xl bg-dark-surface border border-dark-border space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>DNS Synchronization Complete!</span>
              </div>
              <div className="text-slate-300 space-y-1 pt-1">
                <div>Created: <span className="font-semibold text-emerald-400">{result.created.length}</span> records</div>
                <div>Updated / Repaired: <span className="font-semibold text-amber-400">{result.updated.length}</span> records</div>
                <div>Unchanged: <span className="font-semibold text-slate-400">{result.unchanged.length}</span> records</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing Records...</span>
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Provision / Repair DNS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
