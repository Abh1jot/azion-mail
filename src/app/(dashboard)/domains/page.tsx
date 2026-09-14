'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import CloudflareSyncModal from '@/components/CloudflareSyncModal';

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Cloudflare modal state
  const [selectedDomainForSync, setSelectedDomainForSync] = useState<any>(null);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      setDomains(data.domains || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add domain');

      setNewDomain('');
      setIsCreateOpen(false);
      loadDomains();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to delete ${domainName}? All associated mailboxes, aliases, and forwarders will be permanently removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete domain');
        return;
      }
      loadDomains();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Domain Management</h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Add custom email domains, configure DKIM cryptographic keys, and synchronize DNS records via Cloudflare.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Domain</span>
        </button>
      </div>

      {/* Domains Table Card */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="divide-y divide-dark-border">
          {loading ? (
            <div className="p-12 text-center">
              <RotateCw className="h-6 w-6 animate-spin text-azion-400 mx-auto mb-2" />
              <p className="text-xs text-dark-muted">Loading custom domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Globe className="h-10 w-10 text-dark-muted mx-auto" />
              <div className="text-sm font-semibold text-white">No Domains Added</div>
              <p className="text-xs text-dark-muted max-w-sm mx-auto">
                Add your business domain name to start creating mailboxes and forwarding rules.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Domain</span>
              </button>
            </div>
          ) : (
            domains.map((dom) => (
              <div
                key={dom.id}
                className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-dark-surface/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-azion-500/10 border border-azion-500/20 flex items-center justify-center text-azion-400 shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{dom.domain}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-dark-muted mt-0.5 flex items-center gap-3">
                      <span>{dom._count?.mailboxes || 0} Mailboxes</span>
                      <span>&bull;</span>
                      <span>{dom._count?.aliases || 0} Aliases</span>
                      <span>&bull;</span>
                      <span>{dom._count?.forwarders || 0} Forwarders</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setSelectedDomainForSync(dom)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-300 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all cursor-pointer"
                  >
                    <Cloud className="h-3.5 w-3.5 text-orange-400" />
                    <span>Cloudflare Sync</span>
                  </button>
                  <Link
                    href={`/domains/${dom.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-dark-surface border border-dark-border hover:border-slate-700 transition-all"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-azion-400" />
                    <span>DNS Records</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(dom.id, dom.domain)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Domain"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Domain Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add Custom Domain</h3>
            <p className="text-xs text-dark-muted mt-0.5">
              Azion Mail will automatically generate a unique 2048-bit RSA DKIM keypair for this domain.
            </p>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Domain FQDN</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourcompany.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createLoading && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Generate & Save Domain</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cloudflare 1-Click Sync Modal */}
      {selectedDomainForSync && (
        <CloudflareSyncModal
          domainId={selectedDomainForSync.id}
          domainName={selectedDomainForSync.domain}
          isOpen={true}
          onClose={() => setSelectedDomainForSync(null)}
          onSuccess={() => loadDomains()}
        />
      )}
    </div>
  );
}
