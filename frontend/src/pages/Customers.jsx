import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, Loader, Empty, Pill } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Plus, Users, History } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstin: '', opening_balance: '' });
  const [hist, setHist] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get('/customers').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      await api.post('/customers', { name: form.name, phone: form.phone, address: form.address, gstin: form.gstin, opening_balance: Number(form.opening_balance) || 0 });
      toast.success('Customer added'); setForm({ name: '', phone: '', address: '', gstin: '', opening_balance: '' }); setAdvanced(false); setOpen(false); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const viewHistory = async (c) => {
    try { const r = await api.get(`/customers/${c.id}/history`); setHist(r.data); } catch (e) { toast.error(errMsg(e)); }
  };

  if (!list) return <Loader />;

  return (
    <div>
      <PageHeader title="Customers" subtitle="People you sell to — and what they owe" actionLabel="Add Customer" actionIcon={Plus} onAction={() => setOpen(true)} />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="No customers yet." /> : (
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">{c.name[0]}</div>
                  <div><div className="font-semibold text-slate-800">{c.name}</div>{(c.phone || c.address) && <div className="text-xs text-slate-400">{[c.phone, c.address].filter(Boolean).join(' · ')}</div>}</div>
                </div></td>
                <td className="px-5 py-3.5 text-right">{c.balance ? <Pill tone="red">{inr(c.balance)} owed</Pill> : <span className="text-xs text-slate-400">Settled</span>}</td>
                <td className="px-5 py-3.5 text-right w-32"><Button size="sm" variant="outline" onClick={() => viewHistory(c)}><History className="h-4 w-4 mr-1.5" /> History</Button></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} className="h-11" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="h-11" /></div>
              <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} className="h-11" /></div>
            </div>
            <button type="button" onClick={() => setAdvanced((a) => !a)} className="text-sm font-medium text-blue-600 hover:underline">{advanced ? 'Hide advanced' : 'Advanced options'}</button>
            {advanced && (
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div className="space-y-1.5"><Label>Opening balance (₹)</Label><Input type="number" value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} placeholder="0" className="h-11" /></div>
                <div className="space-y-1.5"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} className="h-11" /></div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hist} onOpenChange={(v) => !v && setHist(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{hist?.customer?.name} — Purchase History</DialogTitle></DialogHeader>
          <div className="space-y-2 py-1">
            {(!hist || hist.sales.length === 0) && <Empty text="No purchases yet." />}
            {hist && hist.sales.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-slate-100 rounded-xl px-4 py-3">
                <div><div className="font-semibold text-slate-800">{s.invoice_no}</div><div className="text-xs text-slate-400">{s.date} · {s.status}</div></div>
                <span className="text-lg font-bold num-tabular">{inr(s.total)}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
