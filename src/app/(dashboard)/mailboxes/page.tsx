'use client';

import React, { useEffect, useState } from 'react';
import {
  Mail,
  Plus,
  RotateCw,
  Trash2,
  Lock,
  ExternalLink,
  Shield,
  KeyRound,
  AlertCircle,
  HardDrive,
  Power,
} from 'lucide-react';

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [quotaMb, setQuotaMb] = useState('5120');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit / Password reset state
  const [editMailbox, setEditMailbox] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newQuotaMb, setNewQuotaMb] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [boxRes, domRes] = await Promise.all([
        fetch('/api/mailboxes'),
        fetch('/api/domains'),
      ]);
      const boxData = await boxRes.json();
      const domData = await domRes.json();

      setMailboxes(boxData.mailboxes || []);
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
      const res = await fetch('/api/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomainId,
          username,
          password,
          quotaMb: parseInt(quotaMb, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create mailbox');

      setUsername('');
      setPassword('');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMailbox) return;
    setEditLoading(true);

    try {
      const payload: any = {};
      if (newPassword) payload.password = newPassword;
      if (newQuotaMb) payload.quotaMb = parseInt(newQuotaMb, 10);

      const res = await fetch(`/api/mailboxes/${editMailbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Update failed');
        return;
      }

      setEditMailbox(null);
      setNewPassword('');
      setNewQuotaMb('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const toggleSuspension = async (id: string, currentSuspended: boolean) => {
    try {
      await fetch(`/api/mailboxes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !currentSuspended }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, address: string) => {
    if (!confirm(`Are you sure you want to permanently delete mailbox ${address}? All stored emails will be purged.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/mailboxes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete mailbox');
        return;
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const openWebmail = async (id: string) => {
    try {
      const res = await fetch(`/api/mailboxes/${id}/sso-webmail`, { method: 'POST' });
      const data = await res.json();
      if (data.webmailUrl) {
        window.open(data.webmailUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mailbox Management</h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Create inboxes, allocate storage quotas, manage credentials, and launch integrated SnappyMail webmail.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          disabled={domains.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create Mailbox</span>
        </button>
      </div>

      {domains.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Please add and verify a domain under &quot;Domains&quot; first before creating mailboxes.</span>
        </div>
      )}

      {/* Mailboxes List Card */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="divide-y divide-dark-border">
          {loading ? (
            <div className="p-12 text-center">
              <RotateCw className="h-6 w-6 animate-spin text-azion-400 mx-auto mb-2" />
              <p className="text-xs text-dark-muted">Loading mailboxes...</p>
            </div>
          ) : mailboxes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Mail className="h-10 w-10 text-dark-muted mx-auto" />
              <div className="text-sm font-semibold text-white">No Mailboxes Created</div>
              <p className="text-xs text-dark-muted max-w-sm mx-auto">
                Create user inboxes on your custom domains with custom storage quotas.
              </p>
            </div>
          ) : (
            mailboxes.map((box) => {
              const quotaMb = Math.round(Number(box.quotaBytes) / (1024 * 1024));
              const usedMb = Math.round(Number(box.usedBytes) / (1024 * 1024));
              const percent = quotaMb > 0 ? Math.min(Math.round((usedMb / quotaMb) * 100), 100) : 0;

              return (
                <div
                  key={box.id}
                  className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-dark-surface/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{box.address}</span>
                        {box.isSuspended ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-dark-muted mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          <span>{usedMb} MB / {quotaMb} MB ({percent}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => openWebmail(box.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-azion-300 bg-azion-600/15 border border-azion-500/30 hover:bg-azion-600/25 transition-all cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-azion-400" />
                      <span>Webmail SSO</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditMailbox(box);
                        setNewQuotaMb(String(quotaMb));
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-dark-surface border border-dark-border hover:border-slate-700 transition-colors cursor-pointer"
                      title="Password / Quota Settings"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleSuspension(box.id, box.isSuspended)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        box.isSuspended ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'
                      }`}
                      title={box.isSuspended ? 'Activate Mailbox' : 'Suspend Mailbox'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(box.id, box.address)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Mailbox"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Mailbox Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Virtual Mailbox</h3>
            <p className="text-xs text-dark-muted mt-0.5">
              Generates an IMAP/SMTP authenticated virtual mailbox stored on your Linux VPS.
            </p>

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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username / Prefix</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="support"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-l-xl bg-dark-surface border border-dark-border border-r-0 text-sm text-white focus:outline-none focus:border-azion-500"
                  />
                  <span className="px-3.5 py-2.5 rounded-r-xl bg-dark-surface/80 border border-dark-border text-xs text-dark-muted">
                    @{domains.find((d) => d.id === selectedDomainId)?.domain || 'domain.com'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Strong Mailbox Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Quota (MB)</label>
                <input
                  type="number"
                  required
                  min="500"
                  value={quotaMb}
                  onChange={(e) => setQuotaMb(e.target.value)}
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
                  <span>Create Mailbox</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Mailbox Modal */}
      {editMailbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white">Manage Mailbox</h3>
            <p className="text-xs text-dark-muted mt-0.5">{editMailbox.address}</p>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reset Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  placeholder="New Strong Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Quota (MB)</label>
                <input
                  type="number"
                  min="500"
                  value={newQuotaMb}
                  onChange={(e) => setNewQuotaMb(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMailbox(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editLoading && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
