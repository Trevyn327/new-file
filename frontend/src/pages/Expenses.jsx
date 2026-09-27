import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, StatCard, Pill, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Receipt, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

const CATS = ['Rent', 'Electricity', 'Wages', 'Transport', 'Misc'];

export default function Expenses() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', amount: '', mode: 'Cash', note: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get('/expenses').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const total = (list || []).reduce((a, e) => a + e.amount, 0);
  const save = async () => {
    if (!(Number(form.amount) > 0)) { toast.error('Enter an amount'); return; }
    try { await api.post('/expenses', { category: form.category, amount: Number(form.amount), mode: form.mode, note: form.note }); toast.success('Expense added'); setForm({ category: 'Rent', amount: '', mode: 'Cash', note: '' }); setOpen(false); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!list) return <Loader />;

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Money going out to run the shop" actionLabel="Add Expense" actionIcon={Plus} onAction={() => setOpen(true)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Total Spent" value={inr(total)} icon={ArrowUpCircle} tone="red" />
        <StatCard label="Entries" value={list.length} icon={Receipt} tone="slate" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="No expenses yet." /> : (
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
            {list.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><Receipt className="h-4 w-4" /></div><div><div className="font-semibold text-slate-800">{e.note || e.category}</div><div className="text-xs text-slate-400">{e.category} · {e.date}</div></div></div></td>
                <td className="px-5 py-3.5"><Pill>{e.mode}</Pill></td>
                <td className="px-5 py-3.5 text-right"><span className="text-lg font-bold text-slate-900 num-tabular">{inr(e.amount)}</span></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} className="h-12 text-lg font-semibold" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set('category', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Paid via</Label>
                <Select value={form.mode} onValueChange={(v) => set('mode', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Note (optional)</Label><Input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="What was it for?" className="h-11" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Save Expense</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
