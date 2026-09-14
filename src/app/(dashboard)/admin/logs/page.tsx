'use client';

import React, { useEffect, useState } from 'react';
import { FileCode2, RotateCw, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'delivery' | 'audit'>('delivery');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs?limit=50');
      const data = await res.json();
      setLogs(data.logs || []);
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-dark-surface border border-dark-border text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Logs & Bounce Tracking</h1>
            <p className="text-xs text-dark-muted mt-0.5">Real-time mail delivery events and security audit trail.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('delivery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'delivery' ? 'bg-azion-600 text-white' : 'bg-dark-surface text-slate-400'
            }`}
          >
            Delivery Logs
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'audit' ? 'bg-azion-600 text-white' : 'bg-dark-surface text-slate-400'
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={fetchLogs}
            className="p-1.5 rounded-lg bg-dark-surface border border-dark-border text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        {tab === 'delivery' ? (
          <div className="divide-y divide-dark-border">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-dark-muted">No delivery events logged yet.</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-dark-surface/40 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{l.sender}</span>
                      <span className="text-dark-muted">&rarr;</span>
                      <span className="font-mono text-slate-300">{l.recipient}</span>
                    </div>
                    {l.response && <div className="text-[11px] text-dark-muted font-mono">{l.response}</div>}
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        l.status === 'SENT'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : l.status === 'DEFERRED'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {l.status}
                    </span>
                    <div className="text-[10px] text-dark-muted mt-1">{new Date(l.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
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
      </div>
    </div>
  );
}
