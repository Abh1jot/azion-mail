'use client';

import React from 'react';
import SystemTestCard from '@/components/SystemTestCard';

export default function TestSetupPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Diagnostics & Setup Validation</h1>
        <p className="text-xs text-dark-muted mt-0.5">
          Audit full system integrity: database persistence, caching, SMTP relay, IMAP sockets, Rspamd spam filters, PTR records, and TLS certificates.
        </p>
      </div>

      <SystemTestCard />
    </div>
  );
}
