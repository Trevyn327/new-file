import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { inr } from '../lib/format';
import { PageHeader, StatusPill, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function Purchases() {
  const { refreshLow } = useAuth();
  const [list, setList] = useState(null);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState('cash');
  const [payType, setPayType] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [lines, setLines] = useState([{ product_id: '', qty: 1, price: '' }]);

  const load = () => {
    api.get('/purchases').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/products').then((r) => setProducts(r.data)).catch(() => {});
    api.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setSupplierId('cash'); setPayType('cash'); setAmountPaid(''); setLines([{ product_id: '', qty: 1, price: '' }]); };
  const lineTotal = (l) => (Number(l.price) || 0) * (Number(l.qty) || 0);
  const total = lines.reduce((a, l) => a + lineTotal(l), 0);
  const updateLine = (i, k, v) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines((ls) => [...ls, { product_id: '', qty: 1, price: '' }]);
  const removeLine = (i) => setLines((ls) => ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i));

  const save = async () => {
    const items = lines.filter((l) => l.product_id && Number(l.qty) > 0 && Number(l.price) > 0).map((l) => ({ product_id: l.product_id, qty: Number(l.qty), price: Number(l.price) }));
    if (items.length === 0) { toast.error('Add at least one item with cost'); return; }
    if (payType === 'credit' && supplierId === 'cash') { toast.error('Choose a supplier for credit purchases'); return; }
    setSaving(true);
    try {
      await api.post('/purchases', {
        supplier_id: supplierId === 'cash' ? null : supplierId, items,
        payment_type: payType, amount_paid: payType === 'partial' ? Number(amountPaid) || 0 : 0,
      });
      toast.success('Purchase recorded — stock & average cost updated'); reset(); setOpen(false); load(); refreshLow();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  if (!list) return <Loader />;

  return (
    <div>
      <PageHeader title="Purchases" subtitle="Stock you buy from suppliers" actionLabel="New Purchase" actionIcon={Plus} onAction={() => setOpen(true)}>
        <Button variant="outline" className="h-11" onClick={async () => { try { const r = await api.get('/export/purchases.xlsx', { responseType: 'blob' }); const u = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = u; a.download = 'purchases.xlsx'; a.click(); URL.revokeObjectURL(u); } catch { toast.error('Export failed'); } }}>Export Excel</Button>
      </PageHeader>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="No purchases yet. Record stock you buy from suppliers." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Supplier</th><th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Items</th><th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Truck className="h-4 w-4" /></div><span className="font-semibold text-slate-800">{p.supplier_name}</span></div></td>
                  <td className="px-5 py-3.5 text-slate-500">{p.date}</td>
                  <td className="px-5 py-3.5 text-slate-500">{p.items.reduce((a, i) => a + i.qty, 0)} units</td>
                  <td className="px-5 py-3.5"><StatusPill status={p.status} /></td>
                  <td className="px-5 py-3.5 text-right"><span className="text-lg font-bold text-slate-900 num-tabular">{inr(p.total)}</span>{p.balance_due > 0 && <div className="text-xs text-red-500">{inr(p.balance_due)} due</div>}</td>
                </tr>
              ))}
            </tbody></table></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash / No supplier</SelectItem>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Payment</Label>
                <Select value={payType} onValueChange={setPayType}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Paid now</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="credit">On credit</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Items</Label>
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1"><Select value={l.product_id} onValueChange={(v) => updateLine(i, 'product_id', v)}><SelectTrigger className="h-11"><SelectValue placeholder="Choose product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                  <Input type="number" min="1" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="h-11 w-16" placeholder="Qty" />
                  <Input type="number" value={l.price} onChange={(e) => updateLine(i, 'price', e.target.value)} className="h-11 w-24" placeholder="Cost ₹" />
                  <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={addLine} className="text-sm font-medium text-blue-600 hover:underline">+ Add another item</button>
            </div>
            {payType === 'partial' && (
              <div className="space-y-1.5"><Label>Amount paid now (₹)</Label><Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" className="h-11" /></div>
            )}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"><span className="font-medium text-slate-600">Total</span><span className="text-2xl font-extrabold text-slate-900 num-tabular">{inr(total)}</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">{saving ? 'Saving…' : 'Record Purchase'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
