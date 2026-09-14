'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  Mail,
  Repeat,
  Forward,
  Activity,
  ShieldCheck,
  Server,
  Layers,
  Settings,
  LogOut,
  Sparkles,
  LifeBuoy,
  FileCode2,
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole = 'USER' }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN';

  const navItems = [
    { label: 'Overview', href: '/', icon: Activity },
    { label: 'Domains', href: '/domains', icon: Globe },
    { label: 'Mailboxes', href: '/mailboxes', icon: Mail },
    { label: 'Aliases', href: '/aliases', icon: Repeat },
    { label: 'Forwarders', href: '/forwarders', icon: Forward },
    { label: 'Gmail Wizard', href: '/gmail-wizard', icon: Sparkles, highlight: true },
    { label: 'Outlook / Client Setup', href: '/outlook-wizard', icon: LifeBuoy },
    { label: 'System Test & Health', href: '/test-setup', icon: ShieldCheck, badge: 'Diagnostic' },
  ];

  const adminItems = [
    { label: 'Admin Dashboard', href: '/admin', icon: Server },
    { label: 'Mail Queue', href: '/admin/queue', icon: Layers },
    { label: 'Delivery Logs', href: '/admin/logs', icon: FileCode2 },
  ];

  return (
    <aside className="w-64 min-h-screen bg-dark-card border-r border-dark-border flex flex-col justify-between shrink-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-dark-border gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-azion-600 to-azion-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-azion-500/25">
            A
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">Azion Mail</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-azion-500/15 text-azion-400 border border-azion-500/25">
                v1.0
              </span>
            </div>
            <p className="text-xs text-dark-muted">Azion Cloud Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
            Mail Services
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-azion-600/15 text-azion-300 border border-azion-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-dark-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-azion-400' : item.highlight ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="pt-5 space-y-1">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
                Platform Admin
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-dark-surface'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Profile & Settings */}
      <div className="p-3 border-t border-dark-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-dark-surface transition-all"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Settings & 2FA</span>
        </Link>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-left"
        >
          <LogOut className="h-4 w-4 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
