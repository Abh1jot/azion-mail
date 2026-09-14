'use client';

import React, { useState } from 'react';
import { Sparkles, Check, Copy, ArrowRight, ShieldCheck, Mail, Send, Info } from 'lucide-react';

interface GmailSetupStepperProps {
  mailHost?: string;
  userEmail?: string;
}

export default function GmailSetupStepper({
  mailHost = 'mail.azioncloud.com',
  userEmail = 'support@yourdomain.com',
}: GmailSetupStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Wizard state
  const [domainEmail, setDomainEmail] = useState(userEmail);
  const [gmailAddress, setGmailAddress] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps Header */}
      <div className="glass-card rounded-2xl p-6 border border-dark-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Gmail Integration Hub
            </div>
            <h2 className="text-xl font-bold text-white">Use Gmail as your Business Email Client</h2>
            <p className="text-xs text-dark-muted mt-0.5">
              Receive, reply, and send as <span className="text-azion-400 font-medium">{domainEmail}</span> completely free inside regular Gmail, with your personal Gmail address 100% hidden.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  currentStep === step
                    ? 'bg-azion-600 text-white shadow-md shadow-azion-500/25'
                    : currentStep > step
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-dark-surface text-slate-400 border border-dark-border'
                }`}
              >
                <span>Step {step}</span>
                {currentStep > step && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Forward Incoming Mail to Gmail */}
      {currentStep === 1 && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-azion-600/20 border border-azion-500/30 flex items-center justify-center text-azion-400 font-bold shrink-0">
              1
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Route Incoming Emails to Gmail</h3>
              <p className="text-xs text-dark-muted mt-1 leading-relaxed">
                Azion Mail includes automated <strong>SRS (Sender Rewriting Scheme)</strong>, ensuring that all forwarded emails to Google Workspace and Gmail bypass SPF alignment rejections seamlessly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Custom Domain Email</label>
              <input
                type="email"
                placeholder="e.g. support@yourcompany.com"
                value={domainEmail}
                onChange={(e) => setDomainEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Destination Gmail Address</label>
              <input
                type="email"
                placeholder="e.g. myaccount@gmail.com"
                value={gmailAddress}
                onChange={(e) => setGmailAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-sm text-white focus:outline-none focus:border-azion-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-azion-300 font-semibold">
              <Info className="h-4 w-4" />
              <span>Forwarding Behavior:</span>
            </div>
            <p>
              Incoming messages sent to <strong>{domainEmail || 'your domain email'}</strong> will be instantly forwarded to <strong>{gmailAddress || 'your Gmail inbox'}</strong> in under 200ms.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25 cursor-pointer"
            >
              <span>Continue to SMTP Credentials</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: SMTP Outgoing Credentials Generator */}
      {currentStep === 2 && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-azion-600/20 border border-azion-500/30 flex items-center justify-center text-azion-400 font-bold shrink-0">
              2
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Outgoing SMTP Credentials</h3>
              <p className="text-xs text-dark-muted mt-1">
                Gmail requires these credentials to send emails on behalf of your custom domain.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-dark-surface border border-dark-border relative">
              <span className="text-[11px] font-semibold text-dark-muted uppercase">SMTP Server</span>
              <div className="text-sm font-mono text-white mt-1">{mailHost}</div>
              <button
                onClick={() => copyToClipboard(mailHost, 'host')}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-dark-bg hover:bg-dark-border text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {copiedField === 'host' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-dark-surface border border-dark-border relative">
              <span className="text-[11px] font-semibold text-dark-muted uppercase">Port & Encryption</span>
              <div className="text-sm font-mono text-white mt-1">587 (TLS / STARTTLS)</div>
              <button
                onClick={() => copyToClipboard('587', 'port')}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-dark-bg hover:bg-dark-border text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {copiedField === 'port' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-dark-surface border border-dark-border relative">
              <span className="text-[11px] font-semibold text-dark-muted uppercase">Username</span>
              <div className="text-sm font-mono text-white mt-1">{domainEmail}</div>
              <button
                onClick={() => copyToClipboard(domainEmail, 'user')}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-dark-bg hover:bg-dark-border text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                {copiedField === 'user' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-dark-surface border border-dark-border relative">
              <span className="text-[11px] font-semibold text-dark-muted uppercase">Password</span>
              <input
                type="password"
                placeholder="Enter Mailbox Password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full mt-1 bg-transparent border-none text-sm font-mono text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-azion-600 hover:bg-azion-500 transition-all shadow-md shadow-azion-500/25 cursor-pointer"
            >
              <span>View Gmail Settings Walkthrough</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Visual Gmail Walkthrough Guide */}
      {currentStep === 3 && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-azion-600/20 border border-azion-500/30 flex items-center justify-center text-azion-400 font-bold shrink-0">
              3
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Add Account in Gmail "Send Mail As"</h3>
              <p className="text-xs text-dark-muted mt-1">
                Follow these 4 simple clicks inside your Gmail account:
              </p>
            </div>
          </div>

          {/* Interactive Steps List */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border flex items-start gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-full bg-azion-600/25 text-azion-400 flex items-center justify-center font-bold shrink-0">
                A
              </div>
              <div>
                <span className="font-semibold text-white">Open Gmail Settings:</span> In Gmail, click the gear icon in the top right &rarr; click <strong>See all settings</strong> &rarr; click the <strong>Accounts and Import</strong> tab.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border flex items-start gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-full bg-azion-600/25 text-azion-400 flex items-center justify-center font-bold shrink-0">
                B
              </div>
              <div>
                <span className="font-semibold text-white">Add another email address:</span> Under the "Send mail as" section, click <strong>Add another email address</strong>. In the popup, enter your name and <strong>{domainEmail}</strong>.
                <p className="text-amber-400/90 font-medium mt-1">
                  &bull; Uncheck "Treat as an alias" so replies appear directly from your domain rather than Gmail.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border flex items-start gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-full bg-azion-600/25 text-azion-400 flex items-center justify-center font-bold shrink-0">
                C
              </div>
              <div>
                <span className="font-semibold text-white">Configure SMTP Server:</span> Enter <strong>{mailHost}</strong>, Port <strong>587</strong>, Username <strong>{domainEmail}</strong>, and your password. Select <strong>Secured connection using TLS</strong>.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border flex items-start gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-full bg-emerald-600/25 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                &check;
              </div>
              <div>
                <span className="font-semibold text-white">Enter Confirmation Code:</span> Google will send a 6-digit confirmation code to <strong>{domainEmail}</strong>. Since you set up forwarding in Step 1, it will arrive right in your Gmail inbox! Copy and paste the code to finish.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all cursor-pointer"
            >
              Back
            </button>
            <a
              href="/test-setup"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Test Connection in Diagnostics</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
