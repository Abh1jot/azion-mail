'use client';

import React, { useEffect, useState } from 'react';
import GmailSetupStepper from '@/components/GmailSetupStepper';

export default function GmailWizardPage() {
  const [mailHost, setMailHost] = useState('mail.azioncloud.com');
  const [defaultEmail, setDefaultEmail] = useState('support@yourcompany.com');

  useEffect(() => {
    async function loadInfo() {
      try {
        const domRes = await fetch('/api/domains');
        const domData = await domRes.json();
        if (domData.domains && domData.domains.length > 0) {
          setDefaultEmail(`support@${domData.domains[0].domain}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInfo();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Gmail Client Integration</h1>
        <p className="text-xs text-dark-muted mt-0.5">
          Connect your personal or Google Workspace Gmail account to send and receive from custom domain email addresses.
        </p>
      </div>

      <GmailSetupStepper mailHost={mailHost} userEmail={defaultEmail} />
    </div>
  );
}
