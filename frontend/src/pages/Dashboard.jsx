import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { inr } from '../lib/format';
import { StatCard, Card, Loader, Pill } from '../components/common';
import { Button } from '../components/ui/button';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Boxes, TrendingUp, Plus, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  if (!data) return <Loader />;
  const maxTrend = Math.max(1, ...data.trend.map((t) => t.amount));
  const maxCat = Math.max(1, ...data.category_mix.map((c) => c.value));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1">Here's how your shop is doing today.</p>
        </div>
        <Button onClick={() => navigate('/sales')} className="h-11 px-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm shrink-0">
          <Plus className="h-5 w-5 mr-1.5" /> New Sale
        </Button>
      </div>

      <div className="brand-gradient rounded-2xl p-6 sm:p-7 text-white mb-6 shadow-md">
        <div className="flex items-center gap-2 text-blue-100 text-sm font-medium"><Wallet className="h-4 w-4" /> Working Capital</div>
        <div className="mt-2 text-4xl sm:text-5xl font-extrabold num-tabular">{inr(data.working_capital)}</div>
        <p className="mt-2 text-blue-100 text-sm">Money working in your shop right now — cash + stock + what's owed to you, minus what you owe.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cash in Hand" value={inr(data.cash_in_hand)} icon={ArrowDownCircle} tone="green" />
        <StatCard label="Stock Value" value={inr(data.stock_value)} icon={Boxes} tone="blue" />
        <StatCard label="What We Owe" value={inr(data.total_liabilities)} icon={ArrowUpCircle} tone="red" />
        <StatCard label="Net Profit" value={inr(data.net_profit)} icon={TrendingUp} tone="orange" sub="After all expenses" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Sales — last 7 days" className="lg:col-span-2">
          <div className="p-5">
            <div className="flex items-end gap-3 h-44">
              {data.trend.map((t) => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-full">
                    <div className="w-full max-w-[42px] rounded-t-lg bg-orange-400 hover:bg-orange-500 transition-colors" style={{ height: `${(t.amount / maxTrend) * 100}%`, minHeight: t.amount > 0 ? 6 : 0 }} title={inr(t.amount)} />
                  </div>
                  <span className="text-[11px] text-slate-400">{t.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
              <div><div className="text-xs text-slate-400">Total Sales</div><div className="text-lg font-bold num-tabular">{inr(data.total_sales)}</div></div>
              <div><div className="text-xs text-slate-400">Purchases</div><div className="text-lg font-bold num-tabular">{inr(data.total_purchases)}</div></div>
              <div><div className="text-xs text-slate-400">Gross Profit</div><div className="text-lg font-bold num-tabular text-emerald-600">{inr(data.gross_profit)}</div></div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Invoice Status">
            <div className="p-5 space-y-3">
              {[['paid', 'Paid', 'green'], ['partial', 'Partial', 'orange'], ['unpaid', 'Unpaid', 'red']].map(([k, l, t]) => (
                <div key={k} className="flex items-center justify-between">
                  <Pill tone={t}>{l}</Pill>
                  <span className="text-xl font-bold num-tabular text-slate-900">{data.invoice_status[k]}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Running Low</span>}>
            <div className="p-3">
              {data.low_stock.length === 0 && <div className="text-sm text-slate-400 px-2 py-4 text-center">All good — nothing low.</div>}
              {data.low_stock.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-2 py-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Package className="h-3.5 w-3.5 text-slate-400" />{p.name}</span>
                  <Pill tone="red">{p.stock} {p.unit} left</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {data.category_mix.length > 0 && (
        <Card title="Sales by Category" className="mt-6">
          <div className="p-5 space-y-4">
            {data.category_mix.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  <span className="text-sm font-bold text-slate-900 num-tabular">{inr(c.value)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(c.value / maxCat) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
