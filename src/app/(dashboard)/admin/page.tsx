'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  ShieldAlert,
  RotateCw,
  Play,
  Trash2,
  CheckCircle2,
  Users,
} from 'lucide-react';
import StatsMetricCard from '@/components/StatsMetricCard';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [spamStats, setSpamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sysRes, qRes, spamRes] = await Promise.all([
        fetch('/api/admin/system-stats'),
        fetch('/api/admin/queue'),
        fetch('/api/admin/spam-stats'),
      ]);

      const sysData = await sysRes.json();
      const qData = await qRes.json();
      const spamData = await spamRes.json();

      setStats(sysData);
      setQueue(qData.queue);
      setSpamStats(spamData.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleQueueAction = async (action: 'flush' | 'purge_deferred') => {
    setActionMsg('Executing command...');
    try {
      const res = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setActionMsg(data.message || 'Action completed');
      loadAll();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

  const formatUptime = (sec: number = 0) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Cluster Administration</h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Monitor VPS resources, Postfix mail spool queues, delivery success rates, and Rspamd spam statistics.
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-dark-surface border border-dark-border hover:text-white transition-all cursor-pointer"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-azion-600/15 border border-azion-500/30 text-azion-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Resource Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsMetricCard
          label="RAM Memory Usage"
          value={`${stats?.system?.memory?.usedMb || 0} MB`}
          subtext={`${stats?.system?.memory?.percentage || 0}% of ${stats?.system?.memory?.totalMb || 0} MB`}
          icon={HardDrive}
          color="primary"
        />
        <StatsMetricCard
          label="CPU Load Average"
          value={stats?.system?.loadAverage ? stats.system.loadAverage[0].toFixed(2) : '0.00'}
          subtext={`${stats?.system?.cpuCores || 1} vCPU Cores Available`}
          icon={Cpu}
          color="indigo"
        />
        <StatsMetricCard
          label="Mail Delivery Rate"
          value={`${stats?.delivery24h?.successRate || 100}%`}
          subtext={`${stats?.delivery24h?.sent || 0} sent (last 24h)`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsMetricCard
          label="System Uptime"
          value={formatUptime(stats?.system?.uptimeSeconds)}
          subtext={`Host: ${stats?.system?.hostname || 'linux-vps'}`}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Postfix Queue & Rspamd Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mail Queue Control Card */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Postfix Mail Spool Queue</h3>
                <p className="text-xs text-dark-muted">Active and deferred outgoing messages</p>
              </div>
            </div>
            <Link
              href="/admin/queue"
              className="text-xs font-semibold text-azion-400 hover:text-azion-300"
            >
              View Queue &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <div className="text-lg font-bold text-white">{queue?.activeCount || 0}</div>
              <div className="text-dark-muted text-[11px] mt-0.5">Active</div>
            </div>
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <div className="text-lg font-bold text-amber-400">{queue?.deferredCount || 0}</div>
              <div className="text-dark-muted text-[11px] mt-0.5">Deferred</div>
            </div>
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <div className="text-lg font-bold text-slate-300">{queue?.totalCount || 0}</div>
              <div className="text-dark-muted text-[11px] mt-0.5">Total In Spool</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleQueueAction('flush')}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Flush Queue (postqueue -f)</span>
            </button>
            <button
              onClick={() => handleQueueAction('purge_deferred')}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge Deferred</span>
            </button>
          </div>
        </div>

        {/* Rspamd Spam Filter Stats Card */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Rspamd Heuristics Engine</h3>
              <p className="text-xs text-dark-muted">Adaptive spam filtering & Bayes learning</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <div className="text-lg font-bold text-white">{spamStats?.scanned || 0}</div>
              <div className="text-dark-muted text-[11px] mt-0.5">Scanned</div>
            </div>
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <div className="text-lg font-bold text-emerald-400">{spamStats?.learned_ham || 0}</div>
              <div className="text-dark-muted text-[11px] mt-0.5">Ham Learned</div>
            </div>
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <div className="text-lg font-bold text-rose-400">{spamStats?.learned_spam || 0}</div>
              <div className="text-dark-muted text-[11px] mt-0.5">Spam Blocked</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-surface/60 border border-dark-border text-xs text-dark-muted">
            Status: <span className="text-emerald-400 font-semibold">Active & Learning</span> &bull; Redis Cache backend enabled.
          </div>
        </div>
      </div>
    </div>
  );
}
