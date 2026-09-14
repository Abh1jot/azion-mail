'use client';

import React, { useEffect, useState } from 'react';
import { Repeat, Plus, RotateCw, Trash2, ArrowRight, AlertCircle } from 'lucide-react';

export default function AliasesPage() {
  const [aliases, setAliases] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [sourcePrefix, setSourcePrefix] = useState('');
  const [destination, setDestination] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aliRes, domRes] = await Promise.all([
        fetch('/api/aliases'),
        fetch('/api/domains'),
      ]);
      const aliData = await aliRes.json();
      const domData = await domRes.json();

      setAliases(aliData.aliases || []);
      setDomains(domData.domains || []);
      if (domData.domains && domData.domains.length > 0 && !selectedDomainId) {
        setSelectedDomainId(domData.domains[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomainId,
          sourcePrefix,
          destination,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create alias');

      setSourcePrefix('');
      setDestination('');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string, source: string) => {
    if (!confirm(`Delete alias ${source}?`)) return;
    try {
      const res = await fetch(`/api/aliases/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete alias');
        return;
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Virtual Aliases</h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Route multiple email addresses into an existing mailbox without using extra disk quotas.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          disabled={domains.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create Alias</span>
        </button>
      </div>

      {/* Aliases Table Card */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="divide-y divide-dark-border">
          {loading ? (
            <div className="p-12 text-center">
              <RotateCw className="h-6 w-6 animate-spin text-azion-400 mx-auto mb-2" />
              <p className="text-xs text-dark-muted">Loading aliases...</p>
            </div>
          ) : aliases.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Repeat className="h-10 w-10 text-dark-muted mx-auto" />
              <div className="text-sm font-semibold text-white">No Aliases Configured</div>
              <p className="text-xs text-dark-muted max-w-sm mx-auto">
                Create shortcuts like sales@yourdomain.com routed directly to your personal mailbox.
              </p>
            </div>
          ) : (
            aliases.map((ali) => (
              <div
                key={ali.id}
                className="p-5 sm:px-6 flex items-center justify-between hover:bg-dark-surface/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Repeat className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">{ali.source}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-dark-muted" />
                      <span className="text-sm font-semibold text-azion-300 font-mono">{ali.destination}</span>
                    </div>
                    <div className="text-[11px] text-dark-muted mt-0.5">Internal Mailbox Delivery</div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(ali.id, ali.source)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Delete Alias"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Virtual Alias</h3>
            <p className="text-xs text-dark-muted mt-0.5">Redirect incoming mail to an existing mailbox address.</p>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Domain</label>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.domain}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source Alias Prefix</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="e.g. sales"
                    value={sourcePrefix}
                    onChange={(e) => setSourcePrefix(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-l-xl bg-dark-surface border border-dark-border border-r-0 text-sm text-white focus:outline-none focus:border-azion-500"
                  />
                  <span className="px-3.5 py-2.5 rounded-r-xl bg-dark-surface/80 border border-dark-border text-xs text-dark-muted">
                    @{domains.find((d) => d.id === selectedDomainId)?.domain || 'domain.com'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Mailbox</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@yourcompany.com"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
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
                  <span>Create Alias</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
