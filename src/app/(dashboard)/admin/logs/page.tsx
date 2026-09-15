'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileCode2,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Search,
  Mail,
  Send,
  Eye,
  X,
  Clock,
  Terminal,
  ShieldAlert,
  Server,
  Layers,
  HelpCircle,
  Calendar,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

interface DeliveryLogItem {
  id: string;
  messageId?: string;
  queueId?: string;
  sender: string;
  recipient: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  sizeBytes?: number;
  status: 'SENT' | 'BOUNCED' | 'DEFERRED' | 'REJECTED' | 'QUEUED';
  response?: string;
  errorMessage?: string;
  clientIp?: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<DeliveryLogItem[]>([]);
  const [stats, setStats] = useState({
    sent: 0,
    bounced: 0,
    deferred: 0,
    successRate: 100,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'BOUNCED' | 'DEFERRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'sent' | 'raw' | 'audit'>('sent');
  const [selectedMail, setSelectedMail] = useState<DeliveryLogItem | null>(null);
  const [mailBodyView, setMailBodyView] = useState<'html' | 'text' | 'tech'>('html');
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [purging, setPurging] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRetention = async () => {
    try {
      const res = await fetch('/api/admin/logs/retention');
      const data = await res.json();
      if (data.retentionDays !== undefined) {
        setRetentionDays(data.retentionDays);
      }
    } catch {}
  };

  const handleUpdateRetention = async (newDays: number) => {
    try {
      const res = await fetch('/api/admin/logs/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: newDays }),
      });
      const data = await res.json();
      if (res.ok) {
        setRetentionDays(newDays);
        setToastMsg({
          type: 'success',
          text:
            newDays === 0
              ? 'Retention policy updated: Keep all logs indefinitely.'
              : `Retention policy set to ${newDays} days. Auto-purged ${data.purgedCount || 0} expired logs.`,
        });
        fetchLogs();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to update retention' });
    }
  };

  const handleManualPurge = async () => {
    if (
      !confirm(
        retentionDays === 0
          ? 'Retention is currently set to keep all logs. Change retention to 7, 14, or 30 days to purge old logs.'
          : `Permanently delete all emails and logs older than ${retentionDays} days?`
      )
    ) {
      return;
    }
    if (retentionDays === 0) return;

    setPurging(true);
    try {
      const res = await fetch('/api/admin/logs/retention', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setToastMsg({
          type: 'success',
          text: `Cleaned up ${data.purgedCount} logs older than ${retentionDays} days.`,
        });
        fetchLogs();
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to purge logs' });
    } finally {
      setPurging(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?limit=100&status=${statusFilter}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setLogs(data.logs || []);
      if (data.stats) {
        setStats(data.stats);
      }
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLogs = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/logs', { method: 'POST' });
      const data = await res.json();
      if (data.rawLogs) {
        setRawLogs(data.rawLogs);
      }
      await fetchLogs();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchRetention();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-dark-surface border border-dark-border text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Mail Activity & Sent Emails</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-azion-500/15 text-azion-300 border border-azion-500/30 uppercase">
                Real-Time
              </span>
            </div>
            <p className="text-xs text-dark-muted mt-0.5">
              Inspect all emails sent through mailbox SMTP, view message contents, and track remote delivery errors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Retention Setting Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-surface border border-dark-border text-xs">
            <Calendar className="h-3.5 w-3.5 text-azion-400 shrink-0" />
            <span className="text-dark-muted hidden sm:inline">Retention:</span>
            <select
              value={retentionDays}
              onChange={(e) => handleUpdateRetention(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-semibold cursor-pointer focus:outline-none text-xs"
              title="Automatically purge emails and logs older than this duration"
            >
              <option value={3} className="bg-dark-card text-white">3 Days</option>
              <option value={7} className="bg-dark-card text-white">7 Days (Default)</option>
              <option value={14} className="bg-dark-card text-white">14 Days</option>
              <option value={30} className="bg-dark-card text-white">30 Days</option>
              <option value={90} className="bg-dark-card text-white">90 Days</option>
              <option value={0} className="bg-dark-card text-white">Keep Indefinitely</option>
            </select>
          </div>

          {/* Manual Purge Button */}
          <button
            onClick={handleManualPurge}
            disabled={purging || retentionDays === 0}
            title={retentionDays === 0 ? "Retention is unlimited" : `Purge all logs older than ${retentionDays} days now`}
            className="p-2 rounded-xl bg-dark-surface border border-dark-border text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className={`h-3.5 w-3.5 ${purging ? 'animate-spin text-rose-400' : ''}`} />
          </button>

          {/* Sync Logs Button */}
          <button
            onClick={handleSyncLogs}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-azion-600 hover:bg-azion-500 text-white text-xs font-semibold shadow-md shadow-azion-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Postfix Logs'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`p-3 px-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white cursor-pointer p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-dark-border">
          <div className="text-[11px] font-semibold text-dark-muted uppercase tracking-wider">Sent Messages</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.sent}</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="h-3 w-3" /> Successfully Delivered
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-dark-border">
          <div className="text-[11px] font-semibold text-dark-muted uppercase tracking-wider">Bounced / Rejected</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats.bounced}</div>
          <div className="text-[10px] text-rose-400/80 flex items-center gap-1 mt-0.5">
            <XCircle className="h-3 w-3" /> Delivery Failures
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-dark-border">
          <div className="text-[11px] font-semibold text-dark-muted uppercase tracking-wider">Deferred / Retrying</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.deferred}</div>
          <div className="text-[10px] text-amber-400/80 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" /> Postfix Spool Retries
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-dark-border">
          <div className="text-[11px] font-semibold text-dark-muted uppercase tracking-wider">Delivery Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.successRate}%</div>
          <div className="text-[10px] text-dark-muted mt-0.5">Overall Inbox Health</div>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-surface border border-dark-border">
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sent' ? 'bg-azion-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sent Mails & Events
          </button>
          <button
            onClick={() => {
              setActiveTab('raw');
              if (rawLogs.length === 0) handleSyncLogs();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'raw' ? 'bg-azion-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Live Postfix Stream
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-azion-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Audit
          </button>
        </div>

        {activeTab === 'sent' && (
          <div className="flex items-center gap-2">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-dark-surface p-1 rounded-xl border border-dark-border">
              {(['ALL', 'SENT', 'BOUNCED', 'DEFERRED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    statusFilter === st
                      ? st === 'BOUNCED'
                        ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                        : st === 'DEFERRED'
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                        : 'bg-dark-card text-white font-bold border border-dark-border'
                      : 'text-dark-muted hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-dark-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sender, recipient, subject..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-dark-surface border border-dark-border text-xs text-white placeholder:text-dark-muted focus:outline-none focus:border-azion-500 w-48 sm:w-64"
              />
            </form>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'sent' && (
        <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-muted flex flex-col items-center gap-2">
              <RotateCw className="h-5 w-5 animate-spin text-azion-400" />
              <span>Loading sent mail logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-dark-muted space-y-2">
              <Mail className="h-8 w-8 text-dark-muted mx-auto stroke-1" />
              <div className="text-white font-semibold">No Sent Emails Recorded Yet</div>
              <p className="max-w-md mx-auto text-[11px]">
                When you or your mail client send emails via SMTP (port 587 or 465), Postfix automatically captures
                the email content and delivery status here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-surface/50 text-[11px] font-semibold text-dark-muted uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Status</th>
                    <th className="py-3 px-4">Subject & Content</th>
                    <th className="py-3 px-4">Sender (Mailbox)</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedMail(log)}
                      className="hover:bg-dark-surface/40 transition-colors cursor-pointer group"
                    >
                      {/* Status Badge */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            log.status === 'SENT'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : log.status === 'BOUNCED' || log.status === 'REJECTED'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {log.status === 'SENT' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : log.status === 'BOUNCED' || log.status === 'REJECTED' ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {log.status}
                        </span>
                      </td>

                      {/* Subject & Error Preview */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-white truncate group-hover:text-azion-300 transition-colors">
                          {log.subject || '(No Subject)'}
                        </div>
                        {log.errorMessage ? (
                          <div className="text-[11px] text-rose-400 truncate flex items-center gap-1 font-mono mt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{log.errorMessage}</span>
                          </div>
                        ) : log.response ? (
                          <div className="text-[11px] text-dark-muted truncate font-mono mt-0.5">
                            {log.response}
                          </div>
                        ) : null}
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300">
                        {log.sender}
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300">
                        {log.recipient}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-dark-muted text-[11px]">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMail(log);
                          }}
                          className="p-1.5 rounded-lg bg-dark-surface border border-dark-border text-slate-400 group-hover:text-white group-hover:border-azion-500/50 transition-all cursor-pointer inline-flex items-center gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Raw Postfix Log Stream */}
      {activeTab === 'raw' && (
        <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
          <div className="bg-dark-surface/80 px-4 py-2.5 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white font-mono">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>azion-postfix stdout & delivery queue log</span>
            </div>
            <button
              onClick={handleSyncLogs}
              className="text-[11px] text-azion-400 hover:text-azion-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} /> Refresh Terminal
            </button>
          </div>
          <div className="p-4 bg-black/80 font-mono text-[11px] text-slate-300 max-h-[500px] overflow-y-auto space-y-1">
            {rawLogs.length === 0 ? (
              <div className="text-dark-muted py-8 text-center">Click "Refresh Terminal" to pull latest Postfix container logs.</div>
            ) : (
              rawLogs.map((line, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    line.includes('status=bounced') || line.includes('reject') || line.includes('error')
                      ? 'text-rose-400 font-semibold'
                      : line.includes('status=sent')
                      ? 'text-emerald-400'
                      : line.includes('status=deferred')
                      ? 'text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Security Audit Tab */}
      {activeTab === 'audit' && (
        <div className="glass-card rounded-2xl border border-dark-border divide-y divide-dark-border">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-dark-muted">No audit logs recorded yet.</div>
          ) : (
            auditLogs.map((a) => (
              <div key={a.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-dark-surface/40 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{a.action}</span>
                    <span className="text-dark-muted">by {a.user?.email || 'System'}</span>
                  </div>
                  {a.details && <div className="text-[11px] text-dark-muted font-mono mt-0.5">{a.details}</div>}
                </div>
                <div className="text-[10px] text-dark-muted">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detailed Email Viewer Modal */}
      {selectedMail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="glass-card rounded-3xl border border-dark-border w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:px-6 border-b border-dark-border flex items-start justify-between gap-4 bg-dark-surface/60">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      selectedMail.status === 'SENT'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : selectedMail.status === 'BOUNCED' || selectedMail.status === 'REJECTED'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {selectedMail.status}
                  </span>
                  <span className="text-xs text-dark-muted font-mono">
                    {new Date(selectedMail.createdAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white truncate">{selectedMail.subject || '(No Subject)'}</h2>
              </div>
              <button
                onClick={() => setSelectedMail(null)}
                className="p-2 rounded-xl bg-dark-surface border border-dark-border text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error or Bounce Alert Banner inside modal */}
            {selectedMail.errorMessage && (
              <div className="p-4 mx-6 mt-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-200">Delivery Error / Remote SMTP Response</div>
                  <div className="font-mono text-[11px] break-all leading-relaxed bg-black/40 p-2.5 rounded-xl border border-rose-500/20">
                    {selectedMail.errorMessage}
                  </div>
                  <p className="text-[11px] text-rose-300/80">
                    This error was reported directly by the recipient's mail exchange server during Postfix SMTP delivery.
                  </p>
                </div>
              </div>
            )}

            {/* Metadata Bar */}
            <div className="px-6 py-3 bg-dark-surface/30 border-b border-dark-border grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="text-dark-muted font-medium">From:</span>
                <span className="font-mono text-white truncate">{selectedMail.sender}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <span className="text-dark-muted font-medium">To:</span>
                <span className="font-mono text-white truncate">{selectedMail.recipient}</span>
              </div>
            </div>

            {/* Modal Body Tabs */}
            <div className="px-6 pt-3 flex items-center gap-2 border-b border-dark-border">
              <button
                onClick={() => setMailBodyView('html')}
                className={`px-3 py-1.5 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
                  mailBodyView === 'html'
                    ? 'border-azion-500 text-white'
                    : 'border-transparent text-dark-muted hover:text-white'
                }`}
              >
                Rendered Preview
              </button>
              <button
                onClick={() => setMailBodyView('text')}
                className={`px-3 py-1.5 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
                  mailBodyView === 'text'
                    ? 'border-azion-500 text-white'
                    : 'border-transparent text-dark-muted hover:text-white'
                }`}
              >
                Plain Text
              </button>
              <button
                onClick={() => setMailBodyView('tech')}
                className={`px-3 py-1.5 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
                  mailBodyView === 'tech'
                    ? 'border-azion-500 text-white'
                    : 'border-transparent text-dark-muted hover:text-white'
                }`}
              >
                Technical Headers & Response
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {mailBodyView === 'html' ? (
                selectedMail.bodyHtml ? (
                  <div className="bg-white text-black p-6 rounded-2xl border border-slate-200 overflow-x-auto min-h-[220px]">
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedMail.bodyHtml }}
                    />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-dark-surface border border-dark-border font-mono whitespace-pre-wrap text-slate-300">
                    {selectedMail.bodyText || '(No message content recorded)'}
                  </div>
                )
              ) : mailBodyView === 'text' ? (
                <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border font-mono whitespace-pre-wrap text-slate-300 leading-relaxed max-h-[350px] overflow-y-auto">
                  {selectedMail.bodyText || '(No plain text version found)'}
                </div>
              ) : (
                <div className="space-y-4 font-mono text-[11px]">
                  <div className="p-4 rounded-2xl bg-dark-surface border border-dark-border space-y-2">
                    <div>
                      <span className="text-dark-muted">Message-ID:</span>{' '}
                      <span className="text-white break-all">{selectedMail.messageId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-dark-muted">Postfix Queue ID:</span>{' '}
                      <span className="text-white">{selectedMail.queueId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-dark-muted">Payload Size:</span>{' '}
                      <span className="text-white">{selectedMail.sizeBytes ? `${selectedMail.sizeBytes} bytes` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-dark-muted">Origin Client IP:</span>{' '}
                      <span className="text-white">{selectedMail.clientIp || '127.0.0.1'}</span>
                    </div>
                    <div>
                      <span className="text-dark-muted">Last SMTP Response:</span>{' '}
                      <span className="text-emerald-400 break-all">{selectedMail.response || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-dark-border bg-dark-surface/40 flex justify-end">
              <button
                onClick={() => setSelectedMail(null)}
                className="px-4 py-2 rounded-xl bg-dark-surface border border-dark-border text-white text-xs font-semibold hover:bg-dark-border transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
