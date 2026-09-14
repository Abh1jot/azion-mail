'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Mail,
  Repeat,
  Forward,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Plus,
  ArrowRight,
  Server,
  CheckCircle2,
} from 'lucide-react';
import StatsMetricCard from '@/components/StatsMetricCard';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    domains: 0,
    mailboxes: 0,
    aliases: 0,
    forwarders: 0,
  });
  const [recentDomains, setRecentDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [domRes, boxRes, aliRes, fwdRes] = await Promise.all([
          fetch('/api/domains'),
          fetch('/api/mailboxes'),
          fetch('/api/aliases'),
          fetch('/api/forwarders'),
        ]);

        const domData = await domRes.json();
        const boxData = await boxRes.json();
        const aliData = await aliRes.json();
        const fwdData = await fwdRes.json();

        setStats({
          domains: domData.domains?.length || 0,
          mailboxes: boxData.mailboxes?.length || 0,
          aliases: aliData.aliases?.length || 0,
          forwarders: fwdData.forwarders?.length || 0,
        });

        setRecentDomains((domData.domains || []).slice(0, 5));
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-dark-border">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-azion-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-azion-500/15 text-azion-300 border border-azion-500/30 mb-3">
              <Server className="h-3.5 w-3.5 text-azion-400" />
              Azion Cloud Mail Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Email Hosting Console
            </h1>
            <p className="text-xs sm:text-sm text-dark-muted mt-1 max-w-2xl">
              Host high-reputation business email addresses on your custom domains. Includes 1-Click Cloudflare DNS synchronization,
              Sender Rewriting Scheme (SRS), and native Gmail "Send Mail As" client integration.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/test-setup"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-md shadow-emerald-500/10"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Full System Test</span>
            </Link>
            <Link
              href="/domains"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25"
            >
              <Plus className="h-4 w-4" />
              <span>Add Domain</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsMetricCard
          label="Custom Domains"
          value={stats.domains}
          subtext="Configured & DKIM Signed"
          icon={Globe}
          color="primary"
        />
        <StatsMetricCard
          label="Mailboxes"
          value={stats.mailboxes}
          subtext="Virtual IMAP/SMTP Inboxes"
          icon={Mail}
          color="emerald"
        />
        <StatsMetricCard
          label="Virtual Aliases"
          value={stats.aliases}
          subtext="Internal Routing Rules"
          icon={Repeat}
          color="indigo"
        />
        <StatsMetricCard
          label="Email Forwarders"
          value={stats.forwarders}
          subtext="Gmail / Outlook SRS Routes"
          icon={Forward}
          color="amber"
        />
      </div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gmail Setup Quick Card */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Gmail "Send Mail As"</h3>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              Configure free sending and receiving from your Gmail account without revealing your personal Gmail address.
            </p>
          </div>
          <Link
            href="/gmail-wizard"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>Launch Gmail Wizard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* SnappyMail Webmail Portal */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-xl bg-azion-500/15 border border-azion-500/30 flex items-center justify-center text-azion-400 mb-4">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">SnappyMail Webmail</h3>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              Ultra-lightweight webmail client with dark mode, instant search, folder management, and single sign-on.
            </p>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_WEBMAIL_URL || 'http://localhost:8080'}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-azion-400 hover:text-azion-300 transition-colors"
          >
            <span>Open Webmail Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Diagnostic Health Center */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">1-Click Test Suite</h3>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              Audit the entire stack in one click: PostgreSQL, Redis, Postfix, Dovecot, Rspamd, Reverse DNS, and TLS certificates.
            </p>
          </div>
          <Link
            href="/test-setup"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Run Diagnostics</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Active Domains Table */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Configured Domains</h2>
            <p className="text-xs text-dark-muted">Manage MX records, DKIM public keys, and Cloudflare synchronization</p>
          </div>
          <Link
            href="/domains"
            className="text-xs font-semibold text-azion-400 hover:text-azion-300 transition-colors"
          >
            View All Domains &rarr;
          </Link>
        </div>

        <div className="divide-y divide-dark-border">
          {recentDomains.length === 0 ? (
            <div className="p-8 text-center text-xs text-dark-muted">
              No domains added yet. Click &quot;Add Domain&quot; to configure your first email domain!
            </div>
          ) : (
            recentDomains.map((dom) => (
              <div key={dom.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-dark-surface/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-azion-400" />
                  <div>
                    <span className="text-sm font-semibold text-white">{dom.domain}</span>
                    <div className="text-[11px] text-dark-muted">
                      {dom._count?.mailboxes || 0} mailboxes &bull; {dom._count?.forwarders || 0} forwarders
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Active</span>
                  </span>
                  <Link
                    href={`/domains/${dom.id}`}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-dark-surface border border-dark-border hover:border-slate-700 transition-all"
                  >
                    Manage DNS
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
