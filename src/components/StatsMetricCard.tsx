import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsMetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'primary' | 'emerald' | 'amber' | 'indigo';
}

export default function StatsMetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'primary',
}: StatsMetricCardProps) {
  const colorMap = {
    primary: {
      bg: 'bg-azion-500/10',
      border: 'border-azion-500/20',
      icon: 'text-azion-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: 'text-amber-400',
    },
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      icon: 'text-indigo-400',
    },
  };

  const c = colorMap[color];

  return (
    <div className="glass-card rounded-2xl p-5 border border-dark-border relative overflow-hidden transition-all hover:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dark-muted">{label}</span>
        <div className={`h-8 w-8 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center ${c.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        {subtext && <div className="text-xs text-dark-muted mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}
