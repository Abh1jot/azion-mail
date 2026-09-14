'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, User as UserIcon, ExternalLink } from 'lucide-react';

interface NavbarProps {
  user?: {
    email: string;
    name?: string | null;
    role: string;
  };
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <header className="h-16 border-b border-dark-border bg-dark-bg/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white">Azion Mail Console</h1>
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Mail Services Active
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Diagnostics Action */}
        <Link
          href="/test-setup"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-azion-600/20 text-azion-300 border border-azion-500/30 hover:bg-azion-600/30 transition-all shadow-sm"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-azion-400" />
          <span>System Diagnostics</span>
        </Link>

        {/* Webmail Direct Portal Link */}
        <a
          href={process.env.NEXT_PUBLIC_WEBMAIL_URL || '/webmail'}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <span>Webmail Portal</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        {/* User Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-dark-border">
            <div className="h-8 w-8 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center text-slate-300">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-medium text-white truncate max-w-[150px]">{user.name || user.email}</div>
              <div className="text-[10px] text-azion-400 font-mono uppercase">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
