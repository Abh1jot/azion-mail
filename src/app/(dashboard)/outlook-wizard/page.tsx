'use client';

import React, { useState } from 'react';
import { LifeBuoy, Server, ShieldCheck, Copy, Check, Download, Mail } from 'lucide-react';

export default function OutlookWizardPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const mailHost = process.env.NEXT_PUBLIC_MAIL_HOST || 'mail.azioncloud.com';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadMobileConfig = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadDisplayName</key>
  <string>Azion Mail Configuration</string>
  <key>PayloadIdentifier</key>
  <string>com.azioncloud.mail</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>b3a4c5d6-1122-3344-5566-778899aabbcc</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>EmailAccountDescription</key>
      <string>Azion Mail</string>
      <key>EmailAccountType</key>
      <string>EmailTypeIMAP</string>
      <key>IncomingMailServerHostName</key>
      <string>${mailHost}</string>
      <key>IncomingMailServerPortNumber</key>
      <integer>993</integer>
      <key>IncomingMailServerUseSSL</key>
      <true/>
      <key>OutgoingMailServerHostName</key>
      <string>${mailHost}</string>
      <key>OutgoingMailServerPortNumber</key>
      <integer>587</integer>
      <key>OutgoingMailServerUseSSL</key>
      <true/>
    </dict>
  </array>
</dict>
</plist>`;

    const blob = new Blob([xml], { type: 'application/x-apple-aspen-config' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'azion-mail.mobileconfig';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Client Configuration</h1>
          <p className="text-xs text-dark-muted mt-0.5">
            Settings for Microsoft Outlook, Apple Mail (iOS / macOS), Mozilla Thunderbird, and mobile clients.
          </p>
        </div>

        <button
          onClick={downloadMobileConfig}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25 shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Apple .mobileconfig</span>
        </button>
      </div>

      {/* Manual Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incoming Server */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Incoming Server (IMAP / POP3)</h3>
              <p className="text-xs text-dark-muted">Retrieves messages from your mailbox</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border flex items-center justify-between">
              <div>
                <span className="text-dark-muted font-medium">IMAP Host:</span>
                <span className="ml-2 font-mono text-white font-semibold">{mailHost}</span>
              </div>
              <button
                onClick={() => copyToClipboard(mailHost, 'imap_host')}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedKey === 'imap_host' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <span className="text-dark-muted font-medium">IMAP Port (SSL/TLS):</span>
              <span className="ml-2 font-mono text-emerald-400 font-semibold">993</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <span className="text-dark-muted font-medium">IMAP Port (STARTTLS):</span>
              <span className="ml-2 font-mono text-slate-300 font-semibold">143</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <span className="text-dark-muted font-medium">Authentication:</span>
              <span className="ml-2 font-mono text-slate-300">Normal Password</span>
            </div>
          </div>
        </div>

        {/* Outgoing Server */}
        <div className="glass-card rounded-2xl p-6 border border-dark-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-azion-500/15 border border-azion-500/30 flex items-center justify-center text-azion-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Outgoing Server (SMTP)</h3>
              <p className="text-xs text-dark-muted">Sends messages with DKIM signing</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border flex items-center justify-between">
              <div>
                <span className="text-dark-muted font-medium">SMTP Host:</span>
                <span className="ml-2 font-mono text-white font-semibold">{mailHost}</span>
              </div>
              <button
                onClick={() => copyToClipboard(mailHost, 'smtp_host')}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedKey === 'smtp_host' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <span className="text-dark-muted font-medium">Submission Port (STARTTLS):</span>
              <span className="ml-2 font-mono text-emerald-400 font-semibold">587</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <span className="text-dark-muted font-medium">SMTPS Port (SSL/TLS):</span>
              <span className="ml-2 font-mono text-slate-300 font-semibold">465</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
              <span className="text-dark-muted font-medium">Authentication:</span>
              <span className="ml-2 font-mono text-slate-300">Required (Same as incoming)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
