import React from 'react';
import { Button } from './ui/button';

export function PageHeader({ title, subtitle, actionLabel, onAction, actionIcon: Icon, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm sm:text-base">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && (
          <Button onClick={onAction} className="h-11 px-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm">
            {Icon && <Icon className="h-5 w-5 mr-1.5" />} {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600', orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-700', green: 'bg-emerald-100 text-emerald-600', red: 'bg-red-100 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${tones[tone]}`}><Icon className="h-5 w-5" /></span>}
      </div>
      <div className="mt-3 text-3xl font-extrabold text-slate-900 num-tabular">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-100 text-emerald-700',
    orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function StatusPill({ status }) {
  const map = { paid: 'green', partial: 'orange', unpaid: 'red' };
  const label = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };
  return <Pill tone={map[status] || 'slate'}>{label[status] || status}</Pill>;
}

export function Empty({ text }) {
  return <div className="py-14 text-center text-slate-400 text-sm">{text}</div>;
}

export function Loader() {
  return (
    <div className="py-16 flex items-center justify-center text-slate-400 gap-2">
      <div className="h-5 w-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin" /> Loading…
    </div>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>{action}
        </div>
      )}
      {children}
    </div>
  );
}
