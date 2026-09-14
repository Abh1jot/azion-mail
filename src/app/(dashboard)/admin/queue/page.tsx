'use client';

import React, { useEffect, useState } from 'react';
import { Layers, RotateCw, Play, Trash2, ArrowLeft, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminQueuePage() {
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/queue');
      const data = await res.json();
      setQueue(data.queue);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (action: 'flush' | 'purge_deferred') => {
    setActionMsg('Executing command...');
    try {
      const res = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setActionMsg(data.message || 'Completed');
      fetchQueue();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

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
            <h1 className="text-2xl font-bold text-white tracking-tight">Mail Spool Queue Monitor</h1>
            <p className="text-xs text-dark-muted mt-0.5">Inspect live Postfix mail queue and trigger queue delivery flush.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction('flush')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Flush Queue (postqueue -f)</span>
          </button>
          <button
            onClick={() => handleAction('purge_deferred')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge Deferred Queue</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-azion-600/15 border border-azion-500/30 text-azion-300 text-xs">
          {actionMsg}
        </div>
      )}

      {/* Queue items list */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-dark-border flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Queue Items ({queue?.totalCount || 0})</span>
          <button
            onClick={fetchQueue}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="divide-y divide-dark-border">
          {loading ? (
            <div className="p-8 text-center text-xs text-dark-muted">Inspecting mail queue...</div>
          ) : !queue?.items || queue.items.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Layers className="h-8 w-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-white">Queue is Empty</div>
              <p className="text-xs text-dark-muted">No pending or deferred messages in the Postfix mail spool.</p>
            </div>
          ) : (
            queue.items.map((item: any) => (
              <div key={item.id} className="p-4 sm:px-6 text-xs space-y-2 hover:bg-dark-surface/40">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-azion-400">{item.id}</span>
                  <span className="text-dark-muted">{new Date(item.arrivalTime).toLocaleTimeString()}</span>
                </div>
                <div>
                  <span className="text-dark-muted">From: </span>
                  <span className="text-white font-mono">{item.sender}</span>
                </div>
                <div>
                  <span className="text-dark-muted">To: </span>
                  {item.recipients.map((r: any, idx: number) => (
                    <span key={idx} className="text-slate-300 font-mono mr-2">
                      {r.address} {r.delayReason && <span className="text-amber-400">({r.delayReason})</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
