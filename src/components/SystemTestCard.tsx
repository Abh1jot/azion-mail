'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCw,
  Server,
  Shield,
  Send,
  Database,
  Lock,
  Globe,
  ArrowRight,
} from 'lucide-react';

interface DiagnosticItem {
  id: string;
  name: string;
  category: 'core' | 'mail' | 'security' | 'network';
  status: 'passed' | 'warning' | 'failed';
  latencyMs: number;
  details: string;
  recommendation?: string;
}

interface FullSystemReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  durationMs: number;
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };
  diagnostics: DiagnosticItem[];
}

export default function SystemTestCard() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FullSystemReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SMTP Test State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpProbeTo, setSmtpProbeTo] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpResult, setSmtpResult] = useState<any>(null);

  const runFullTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/test-setup/full-test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Diagnostic run failed');
      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runSmtpTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpLoading(true);
    setSmtpResult(null);
    try {
      const res = await fetch('/api/test-setup/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost || undefined,
          port: smtpPort,
          username: smtpUser || undefined,
          password: smtpPass || undefined,
          sendProbeTo: smtpProbeTo || undefined,
        }),
      });
      const data = await res.json();
      setSmtpResult(data.result);
    } catch (err: any) {
      setSmtpResult({ success: false, error: err.message });
    } finally {
      setSmtpLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Test Trigger Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-azion-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-azion-500/15 text-azion-300 border border-azion-500/30 mb-3">
              <Shield className="h-3.5 w-3.5" />
              Automated VPS Diagnostic Center
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Full System Health & Services Check</h2>
            <p className="text-sm text-dark-muted mt-1 max-w-xl">
              Execute comprehensive live validation across PostgreSQL, Redis, Postfix SMTP, Dovecot IMAP,
              Rspamd anti-spam filter, VPS Reverse DNS (PTR), and SSL certificates in one click.
            </p>
          </div>

          <button
            onClick={runFullTest}
            disabled={loading}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-azion-600 to-indigo-600 hover:from-azion-500 hover:to-indigo-500 transition-all shadow-lg shadow-azion-600/30 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin text-white" />
                <span>Testing Services...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Full System Test</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Matrix */}
        {report && (
          <div className="mt-8 pt-6 border-t border-dark-border/80 space-y-6">
            {/* Scoreboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border text-center">
                <div className="text-2xl font-bold text-white">{report.summary.total}</div>
                <div className="text-xs text-dark-muted font-medium mt-0.5">Services Audited</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-2xl font-bold text-emerald-400">{report.summary.passed}</div>
                <div className="text-xs text-emerald-300 font-medium mt-0.5">Passed Checks</div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-2xl font-bold text-amber-400">{report.summary.warnings}</div>
                <div className="text-xs text-amber-300 font-medium mt-0.5">Warnings</div>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-2xl font-bold text-rose-400">{report.summary.failed}</div>
                <div className="text-xs text-rose-300 font-medium mt-0.5">Failed Checks</div>
              </div>
            </div>

            {/* Diagnostic Items List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.diagnostics.map((item) => {
                const isPassed = item.status === 'passed';
                const isWarn = item.status === 'warning';
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isPassed
                        ? 'bg-dark-surface/40 border-emerald-500/25'
                        : isWarn
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-rose-500/5 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {isPassed && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                        {isWarn && <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />}
                        {!isPassed && !isWarn && <XCircle className="h-5 w-5 text-rose-400 shrink-0" />}
                        <div>
                          <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                          <span className="text-[11px] text-dark-muted font-mono">{item.latencyMs}ms</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          isPassed
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isWarn
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{item.details}</p>

                    {item.recommendation && (
                      <div className="mt-2.5 pt-2 border-t border-dark-border/60 text-[11px] text-amber-300/90 flex items-start gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{item.recommendation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Live Interactive SMTP Handshake Tester */}
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Live SMTP Connection & Probe Tester</h3>
            <p className="text-xs text-dark-muted">
              Verify credentials, STARTTLS / SSL handshake, and deliverability directly before configuring Gmail or email clients.
            </p>
          </div>
        </div>

        <form onSubmit={runSmtpTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SMTP Host</label>
              <input
                type="text"
                placeholder="mail.yourdomain.com (default)"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
              <select
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              >
                <option value="587">587 (STARTTLS / Submission)</option>
                <option value="465">465 (SSL / SMTPS)</option>
                <option value="25">25 (Standard Relay)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Probe (Optional)</label>
              <input
                type="email"
                placeholder="your-personal@gmail.com"
                value={smtpProbeTo}
                onChange={(e) => setSmtpProbeTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username (Email Address)</label>
              <input
                type="text"
                placeholder="support@yourdomain.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                placeholder="Mailbox Password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={smtpLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-dark-surface border border-azion-500/40 hover:bg-azion-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {smtpLoading ? <RotateCw className="h-4 w-4 animate-spin text-azion-400" /> : <Send className="h-4 w-4 text-azion-400" />}
            <span>Test SMTP Connection</span>
          </button>
        </form>

        {smtpResult && (
          <div className="mt-6 p-4 rounded-xl bg-dark-surface/80 border border-dark-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-dark-muted">Test Result</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  smtpResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {smtpResult.success ? 'ALL CHECKS PASSED' : 'FAILED'}
              </span>
            </div>

            {smtpResult.steps?.map((s: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                {s.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-white">{s.step}</span>
                  <span className="text-dark-muted ml-2">({s.durationMs}ms)</span>
                  <p className="text-slate-300 mt-0.5">{s.message}</p>
                </div>
              </div>
            ))}

            {smtpResult.error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {smtpResult.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
