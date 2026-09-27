import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { Loader, Card } from '../components/common';
import { Wallet, Boxes, ArrowDownCircle, Banknote, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkingCapital() {
  const [m, setM] = useState(null);
  useEffect(() => { api.get('/working-capital').then((r) => setM(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!m) return <Loader />;

  const rows = [
    { label: 'Cash in Hand', help: 'Cash + bank money you hold', value: m.cash, sign: '+', tone: 'orange', icon: Banknote },
    { label: 'Stock Value', help: 'What your shelves are worth (at cost)', value: m.stock_value, sign: '+', tone: 'blue', icon: Boxes },
    { label: "What Customers Owe Us", help: 'Accounts receivable', value: m.accounts_receivable, sign: '+', tone: 'green', icon: ArrowDownCircle },
    { label: 'What We Owe Suppliers', help: 'Accounts payable', value: m.accounts_payable, sign: '−', tone: 'red', icon: ArrowUpCircle },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Working Capital</h1>
        <p className="text-slate-500 mt-1">The money working inside your shop right now.</p>
      </div>
      <div className="brand-gradient rounded-2xl p-7 text-white mb-8 shadow-md">
        <div className="flex items-center gap-2 text-blue-100 text-sm font-medium"><Wallet className="h-4 w-4" /> Total Working Capital</div>
        <div className="mt-2 text-5xl font-extrabold num-tabular">{inr(m.working_capital)}</div>
        <p className="mt-3 text-blue-100 text-sm">Cash + Stock + What customers owe us − What we owe suppliers</p>
      </div>
      <Card title="How it adds up">
        <div className="divide-y divide-slate-50">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${r.tone === 'blue' ? 'bg-blue-50 text-blue-600' : r.tone === 'green' ? 'bg-emerald-50 text-emerald-600' : r.tone === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-500'}`}><r.icon className="h-5 w-5" /></div>
                <div><div className="font-semibold text-slate-800">{r.label}</div><div className="text-xs text-slate-400">{r.help}</div></div>
              </div>
              <div className={`text-xl font-extrabold num-tabular ${r.sign === '−' ? 'text-red-500' : 'text-slate-900'}`}>{r.sign} {inr(r.value)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50"><div className="font-bold text-slate-800">Working Capital</div><div className="text-2xl font-extrabold num-tabular text-slate-900">{inr(m.working_capital)}</div></div>
        </div>
      </Card>
    </div>
  );
}
