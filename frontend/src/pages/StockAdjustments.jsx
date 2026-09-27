import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Pill, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const REASONS = ['Damage', 'Loss', 'Theft', 'Recount', 'Other'];

export default function StockAdjustments() {
  const { refreshLow } = useAuth();
  const [list, setList] = useState(null);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', direction: 'decrease', qty: '', reason: 'Damage', note: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => {
    api.get('/stock-adjustments').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/products').then((r) => setProducts(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.product_id || !(Number(form.qty) > 0)) { toast.error('Choose product and quantity'); return; }
    const change = (form.direction === 'increase' ? 1 : -1) * Number(form.qty);
    try { await api.post('/stock-adjustments', { product_id: form.product_id, change, reason: form.reason, note: form.note }); toast.success('Stock adjusted'); setForm({ product_id: '', direction: 'decrease', qty: '', reason: 'Damage', note: '' }); setOpen(false); load(); refreshLow(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!list) return <Loader />;

  return (
    <div>
      <PageHeader title="Stock Adjustments" subtitle="Fix stock for damage, loss or a recount" actionLabel="Adjust Stock" actionIcon={Plus} onAction={() => setOpen(true)} />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="No adjustments yet." /> : (
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
            {list.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><SlidersHorizontal className="h-4 w-4" /></div><div><div className="font-semibold text-slate-800">{a.product_name}</div><div className="text-xs text-slate-400">{a.date} · {a.reason}{a.note ? ` · ${a.note}` : ''} · by {a.created_by_name}</div></div></div></td>
                <td className="px-5 py-3.5 text-right"><Pill tone={a.change >= 0 ? 'green' : 'red'}>{a.change >= 0 ? '+' : ''}{a.change}</Pill></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => set('product_id', v)}><SelectTrigger className="h-11"><SelectValue placeholder="Choose product" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => set('direction', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="decrease">Decrease</SelectItem><SelectItem value="increase">Increase</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.qty} onChange={(e) => set('qty', e.target.value)} className="h-11" /></div>
            </div>
            <div className="space-y-1.5"><Label>Reason</Label>
              <Select value={form.reason} onValueChange={(v) => set('reason', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Note (optional)</Label><Input value={form.note} onChange={(e) => set('note', e.target.value)} className="h-11" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
