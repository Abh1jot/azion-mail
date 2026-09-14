'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Globe,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Cloud,
  ArrowLeft,
  Shield,
  Download,
} from 'lucide-react';
import CloudflareSyncModal from '@/components/CloudflareSyncModal';

export default function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCfModalOpen, setIsCfModalOpen] = useState(false);

  const fetchDns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${id}/dns-records`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDns();
  }, [id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/domains"
            className="p-2 rounded-xl bg-dark-surface border border-dark-border text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {data?.domain || 'Loading Domain...'}
              </h1>
              {data?.dnsHealth && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    data.dnsHealth.overallStatus === 'healthy'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : data.dnsHealth.overallStatus === 'degraded'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {data.dnsHealth.overallStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-dark-muted mt-0.5">
              Cryptographic DKIM key, SPF authorization, and Cloudflare auto-provisioning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchDns}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-dark-surface border border-dark-border hover:text-white transition-all cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-check DNS</span>
          </button>
          <button
            onClick={() => setIsCfModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 transition-all shadow-md shadow-orange-500/25 cursor-pointer"
          >
            <Cloud className="h-4 w-4" />
            <span>1-Click Cloudflare Sync</span>
          </button>
        </div>
      </div>

      {/* DNS Diagnostic Summary Banner */}
      {data?.dnsHealth && (
        <div
          className={`p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-4 ${
            data.dnsHealth.overallStatus === 'healthy'
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {data.dnsHealth.overallStatus === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-semibold">
                {data.dnsHealth.overallStatus === 'healthy'
                  ? 'All core mail records (MX, SPF, DKIM, DMARC) are validated on public DNS!'
                  : 'Some DNS records are missing or have drifted on public resolvers.'}
              </span>
              <p className="text-dark-muted mt-0.5">
                Use 1-Click Cloudflare Sync or manually paste the records below into your registrar/DNS provider.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DNS Records Table */}
      <div className="glass-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h2 className="text-base font-bold text-white">Required DNS Records</h2>
          <p className="text-xs text-dark-muted">
            These records authenticate Azion Mail servers and ensure 100% inbox delivery rate without landing in spam.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-surface/60 text-dark-muted border-b border-dark-border font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Host / Name</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-dark-muted">
                    <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2 text-azion-400" />
                    Querying DNS records...
                  </td>
                </tr>
              ) : (
                data?.recommendedRecords?.map((rec: any, idx: number) => (
                  <tr key={idx} className="hover:bg-dark-surface/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-azion-400">{rec.type}</td>
                    <td className="py-3.5 px-4 font-mono text-white select-all">{rec.name}</td>
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md truncate font-mono text-slate-300 select-all" title={rec.value}>
                      {rec.value}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{rec.priority ?? '-'}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => copyToClipboard(rec.value, `rec_${idx}`)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-surface hover:bg-dark-border text-slate-300 hover:text-white transition-all cursor-pointer font-medium"
                      >
                        {copiedKey === `rec_${idx}` ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cloudflare Sync Modal */}
      {data?.domain && (
        <CloudflareSyncModal
          domainId={id}
          domainName={data.domain}
          isOpen={isCfModalOpen}
          onClose={() => setIsCfModalOpen(false)}
          onSuccess={() => fetchDns()}
        />
      )}
    </div>
  );
}
