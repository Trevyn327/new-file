import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, StatCard, Card, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Landmark } from 'lucide-react';
import { toast } from 'sonner';

export default function Capital() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'Owner Investment', amount: '', note: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get('/capital').then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!(Number(form.amount) > 0)) { toast.error('Enter an amount'); return; }
    try { await api.post('/capital', { type: form.type, amount: Number(form.amount), note: form.note }); toast.success('Recorded'); setForm({ type: 'Owner Investment', amount: '', note: '' }); setOpen(false); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!data) return <Loader />;
  const inTypes = ['Opening Capital', 'Owner Investment', 'Loan Received'];

  return (
    <div>
      <PageHeader title="Capital" subtitle="Money you and lenders put into the shop" actionLabel="Add Entry" actionIcon={Plus} onAction={() => setOpen(true)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Net Capital In Business" value={inr(data.net_capital)} icon={Landmark} tone="blue" />
        <StatCard label="Entries" value={data.entries.length} tone="slate" />
      </div>
      <Card title="Capital History">
        <div className="divide-y divide-slate-50">
          {data.entries.length === 0 && <Empty text="No capital entries yet." />}
          {data.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
              <div><div className="font-semibold text-slate-800">{e.type}</div><div className="text-xs text-slate-400">{e.date}{e.note ? ` · ${e.note}` : ''}</div></div>
              <div className="text-right"><span className={`text-lg font-bold num-tabular ${inTypes.includes(e.type) ? 'text-emerald-600' : 'text-red-500'}`}>{inTypes.includes(e.type) ? '+' : '−'} {inr(e.amount)}</span><div className="text-xs text-slate-400 num-tabular">Bal: {inr(e.running_balance)}</div></div>
            </div>
          ))}
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Capital Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{data.types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} className="h-12 text-lg font-semibold" /></div>
            <div className="space-y-1.5"><Label>Note (optional)</Label><Input value={form.note} onChange={(e) => set('note', e.target.value)} className="h-11" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
