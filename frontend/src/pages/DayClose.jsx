import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, StatCard, Card, Loader, Empty, Pill } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function DayClose() {
  const [exp, setExp] = useState(null);
  const [list, setList] = useState(null);
  const [counted, setCounted] = useState('');

  const load = () => {
    api.get('/day-close/expected').then((r) => setExp(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/day-close').then((r) => setList(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const close = async () => {
    if (counted === '') { toast.error('Enter the cash you counted'); return; }
    try { await api.post('/day-close', { counted_cash: Number(counted) }); toast.success('Day closed'); setCounted(''); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!exp) return <Loader />;
  const variance = counted === '' ? null : Number(counted) - exp.expected_cash;

  return (
    <div>
      <PageHeader title="Day-End Cash Close" subtitle="Count your cash drawer and check it matches" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Opening Cash" value={inr(exp.opening_cash)} tone="slate" />
        <StatCard label="Cash Sales Today" value={inr(exp.cash_sales)} tone="green" />
        <StatCard label="Cash Out Today" value={inr(exp.cash_expenses + exp.cash_purchases)} tone="red" />
        <StatCard label="Expected in Drawer" value={inr(exp.expected_cash)} icon={CalendarCheck} tone="orange" />
      </div>

      {exp.already_closed ? (
        <Card className="mb-6"><div className="p-6 text-center text-slate-500">Today ({exp.date}) is already closed. Come back tomorrow.</div></Card>
      ) : (
        <Card title={`Close ${exp.date}`} className="mb-6 max-w-lg">
          <div className="p-6 space-y-4">
            <div className="space-y-1.5"><Label>Cash counted in drawer (₹)</Label><Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} className="h-12 text-lg font-semibold" /></div>
            {variance !== null && (
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"><span className="font-medium text-slate-600">Difference</span><span className={`text-xl font-extrabold num-tabular ${Math.abs(variance) < 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>{variance >= 0 ? '+' : '−'} {inr(Math.abs(variance))}</span></div>
            )}
            <Button onClick={close} className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-6">Close Day</Button>
          </div>
        </Card>
      )}

      <Card title="Past Closings">
        <div className="divide-y divide-slate-50">
          {(!list || list.length === 0) && <Empty text="No day closings yet." />}
          {list && list.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
              <div><div className="font-semibold text-slate-800">{d.date}</div><div className="text-xs text-slate-400">Expected {inr(d.expected_cash)} · Counted {inr(d.counted_cash)}</div></div>
              <Pill tone={Math.abs(d.variance) < 0.5 ? 'green' : 'red'}>{d.variance >= 0 ? '+' : '−'}{inr(Math.abs(d.variance))}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
