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
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import StatsMetricCard from '@/components/StatsMetricCard';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    domains: 0,
    mailboxes: 0,
    aliases: 0,
    forwarders: 0,
    sent: 0,
    bounced: 0,
    deferred: 0,
    successRate: 100,
  });
  const [recentDomains, setRecentDomains] = useState<any[]>([]);
  const [recentSentMails, setRecentSentMails] = useState<any[]>([]);
  const [recentBounces, setRecentBounces] = useState<any[]>([]);
  const [deliverability, setDeliverability] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [domRes, boxRes, aliRes, fwdRes, logRes, delivRes] = await Promise.all([
          fetch('/api/domains'),
          fetch('/api/mailboxes'),
          fetch('/api/aliases'),
          fetch('/api/forwarders'),
          fetch('/api/admin/logs?limit=5'),
          fetch('/api/admin/deliverability-check').catch(() => null),
        ]);

        const domData = await domRes.json();
        const boxData = await boxRes.json();
        const aliData = await aliRes.json();
        const fwdData = await fwdRes.json();
        const logData = await logRes.json();
        const delivData = delivRes ? await delivRes.json() : null;

        setStats({
          domains: domData.domains?.length || 0,
          mailboxes: boxData.mailboxes?.length || 0,
          aliases: aliData.aliases?.length || 0,
          forwarders: fwdData.forwarders?.length || 0,
          sent: logData.stats?.sent || 0,
          bounced: logData.stats?.bounced || 0,
          deferred: logData.stats?.deferred || 0,
          successRate: logData.stats?.successRate ?? 100,
        });

        setRecentDomains((domData.domains || []).slice(0, 5));
        setRecentSentMails(logData.logs || []);
        setRecentBounces((logData.logs || []).filter((l: any) => l.status === 'BOUNCED' || l.status === 'REJECTED'));
        setDeliverability(delivData);
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
              DKIM / ARC cryptographic signing, and native Gmail "Send Mail As" client integration.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/logs"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-azion-300 bg-azion-500/15 border border-azion-500/30 hover:bg-azion-500/25 transition-all shadow-md shadow-azion-500/10"
            >
              <Send className="h-4 w-4 text-azion-400" />
              <span>Sent Mails & Logs</span>
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

      {/* Delivery Error / Bounce Alert Banner (Only shown if errors exist) */}
      {recentBounces.length > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Delivery Failure Alert: {recentBounces.length} recent bounced email(s)</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Action Required
                </span>
              </div>
              <div className="text-xs text-rose-300/80 font-mono truncate max-w-xl">
                To: {recentBounces[0]?.recipient} &bull; {recentBounces[0]?.errorMessage || recentBounces[0]?.response || 'Remote SMTP rejection'}
              </div>
            </div>
          </div>
          <Link
            href="/admin/logs?status=BOUNCED"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/25 transition-all shrink-0"
          >
            Inspect Failed Emails &rarr;
          </Link>
        </div>
      )}

      {/* Gmail Deliverability & Reverse DNS Recommendation Card */}
      {deliverability && deliverability.ptr && !deliverability.ptr.valid && (
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-white text-sm">
                Gmail Inbox Deliverability Notice: Reverse DNS (PTR) Not Configured
              </div>
              <p className="text-xs text-amber-200/80 max-w-2xl leading-relaxed">
                Your VPS IP ({deliverability.serverIp}) resolves to &quot;{deliverability.ptr.hostname || 'None'}&quot;. Google sends emails to Spam unless the PTR record matches &quot;{deliverability.mailHost}&quot;.
              </p>
            </div>
          </div>
          <Link
            href="/test-setup"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all shrink-0"
          >
            PTR Setup Guide &rarr;
          </Link>
        </div>
      )}

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
          label="Sent Messages"
          value={stats.sent}
          subtext={`${stats.successRate}% Inbox Delivery Rate`}
          icon={Send}
          color="indigo"
        />
        <StatsMetricCard
          label="Bounced / Errors"
          value={stats.bounced}
          subtext={stats.bounced === 0 ? 'Zero Delivery Failures' : 'Needs Review'}
          icon={AlertTriangle}
          color={stats.bounced === 0 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sent Mail & Activity Inspector */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-xl bg-azion-500/15 border border-azion-500/30 flex items-center justify-center text-azion-400 mb-4">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Sent Mails & Live Logs</h3>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              View all emails sent from your mailboxes via SMTP. Read full message bodies, track delivery statuses, and inspect bounce error logs.
            </p>
          </div>
          <Link
            href="/admin/logs"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-azion-400 hover:text-azion-300 transition-colors"
          >
            <span>Open Sent Mail Inspector</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

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

        {/* Diagnostic Health Center */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Deliverability & System Test</h3>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              Audit the entire stack in one click: Reverse DNS (PTR), DKIM signatures, SPF, DMARC, Postfix, Dovecot, and Let&apos;s Encrypt SSL.
            </p>
          </div>
          <Link
            href="/test-setup"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Run Deliverability Test</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Sent Mail Activity Table */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Sent Mail Activity</h2>
            <p className="text-xs text-dark-muted">Latest outbound emails processed through Postfix SMTP submission</p>
          </div>
          <Link
            href="/admin/logs"
            className="text-xs font-semibold text-azion-400 hover:text-azion-300 transition-colors"
          >
            View All Sent Emails &rarr;
          </Link>
        </div>

        <div className="divide-y divide-dark-border">
          {recentSentMails.length === 0 ? (
            <div className="p-8 text-center text-xs text-dark-muted">
              No sent emails recorded yet. Outgoing messages from mailbox SMTP are automatically captured here.
            </div>
          ) : (
            recentSentMails.slice(0, 5).map((mail) => (
              <div key={mail.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-dark-surface/40 transition-colors">
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        mail.status === 'SENT'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : mail.status === 'BOUNCED' || mail.status === 'REJECTED'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {mail.status}
                    </span>
                    <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                      {mail.subject || '(No Subject)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-dark-muted flex items-center gap-2 font-mono truncate">
                    <span>From: {mail.sender}</span>
                    <span>&rarr;</span>
                    <span>To: {mail.recipient}</span>
                  </div>
                  {mail.errorMessage && (
                    <div className="text-[11px] text-rose-400 font-mono truncate">
                      ⚠️ Error: {mail.errorMessage}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-[11px] text-dark-muted hidden sm:block">
                    {new Date(mail.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <Link
                    href="/admin/logs"
                    className="p-1.5 rounded-lg bg-dark-surface border border-dark-border text-slate-400 hover:text-white transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
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
