import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { inr } from '../lib/format';
import { PageHeader, StatusPill, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, ShoppingCart, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

export default function Sales() {
  const navigate = useNavigate();
  const { refreshLow } = useAuth();
  const [list, setList] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('walkin');
  const [payType, setPayType] = useState('cash');
  const [payMode, setPayMode] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discType, setDiscType] = useState('flat');
  const [discVal, setDiscVal] = useState('');
  const [scan, setScan] = useState('');
  const [lines, setLines] = useState([{ product_id: '', qty: 1 }]);

  const load = () => {
    api.get('/sales').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/products').then((r) => setProducts(r.data)).catch(() => {});
    api.get('/customers').then((r) => setCustomers(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setCustomerId('walkin'); setPayType('cash'); setPayMode('Cash'); setAmountPaid(''); setDiscType('flat'); setDiscVal(''); setLines([{ product_id: '', qty: 1 }]); };
  const priceOf = (id) => products.find((p) => p.id === id)?.selling_price || 0;
  const lineTotal = (l) => priceOf(l.product_id) * (Number(l.qty) || 0);
  const subtotal = lines.reduce((a, l) => a + lineTotal(l), 0);
  const discount = Math.min(discType === 'percent' ? subtotal * (Number(discVal) || 0) / 100 : (Number(discVal) || 0), subtotal);
  const grand = Math.max(0, subtotal - discount);

  const updateLine = (i, k, v) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines((ls) => [...ls, { product_id: '', qty: 1 }]);
  const removeLine = (i) => setLines((ls) => ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i));

  const handleScan = async (e) => {
    if (e.key !== 'Enter' || !scan.trim()) return;
    e.preventDefault();
    try {
      const r = await api.get('/products/lookup', { params: { code: scan.trim() } });
      setLines((ls) => {
        const idx = ls.findIndex((l) => l.product_id === r.data.id);
        if (idx >= 0) return ls.map((l, i) => i === idx ? { ...l, qty: Number(l.qty) + 1 } : l);
        const blank = ls.findIndex((l) => !l.product_id);
        if (blank >= 0) return ls.map((l, i) => i === blank ? { product_id: r.data.id, qty: 1 } : l);
        return [...ls, { product_id: r.data.id, qty: 1 }];
      });
      setScan('');
    } catch (err) { toast.error(errMsg(err, 'No product with that code')); }
  };

  const save = async () => {
    const items = lines.filter((l) => l.product_id && Number(l.qty) > 0).map((l) => ({ product_id: l.product_id, qty: Number(l.qty), price: priceOf(l.product_id) }));
    if (items.length === 0) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      const r = await api.post('/sales', {
        customer_id: customerId === 'walkin' ? null : customerId, items,
        discount_type: discType, discount_value: Number(discVal) || 0,
        payment_type: payType, payment_mode: payMode, amount_paid: payType === 'partial' ? Number(amountPaid) || 0 : 0,
      });
      toast.success(`Sale recorded — ${r.data.invoice_no}`); reset(); setOpen(false); load(); refreshLow();
      navigate(`/sales/${r.data.id}`);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  if (!list) return <Loader />;

  return (
    <div>
      <PageHeader title="Billing & Sales" subtitle="Create bills and record what you sell" actionLabel="New Sale" actionIcon={Plus} onAction={() => setOpen(true)}>
        <Button variant="outline" className="h-11" onClick={async () => { try { const r = await api.get('/export/sales.xlsx', { responseType: 'blob' }); const u = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = u; a.download = 'sales.xlsx'; a.click(); URL.revokeObjectURL(u); } catch { toast.error('Export failed'); } }}>Export Excel</Button>
      </PageHeader>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="No sales yet. Tap 'New Sale' to record your first one." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Invoice</th><th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => navigate(`/sales/${s.id}`)}>
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center"><ShoppingCart className="h-4 w-4" /></div><span className="font-semibold text-slate-800">{s.invoice_no}</span></div></td>
                  <td className="px-5 py-3.5 text-slate-600">{s.customer_name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{s.date}</td>
                  <td className="px-5 py-3.5"><StatusPill status={s.status} /></td>
                  <td className="px-5 py-3.5 text-right"><span className="text-lg font-bold text-slate-900 num-tabular">{inr(s.total)}</span>{s.balance_due > 0 && <div className="text-xs text-red-500">{inr(s.balance_due)} due</div>}</td>
                </tr>
              ))}
            </tbody></table></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sale</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="relative"><ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={handleScan} placeholder="Scan barcode / SKU and press Enter" className="pl-9 h-11" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="walkin">Walk-in</SelectItem>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Payment type</Label>
                <Select value={payType} onValueChange={setPayType}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Full payment</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="credit">On credit</SelectItem></SelectContent></Select></div>
            </div>

            <div className="space-y-2"><Label>Items</Label>
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1"><Select value={l.product_id} onValueChange={(v) => updateLine(i, 'product_id', v)}><SelectTrigger className="h-11"><SelectValue placeholder="Choose product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {inr(p.selling_price)} ({p.stock} {p.unit})</SelectItem>)}</SelectContent></Select></div>
                  <Input type="number" min="1" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="h-11 w-20" />
                  <div className="w-24 text-right num-tabular font-semibold text-slate-700 text-sm">{inr(lineTotal(l))}</div>
                  <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={addLine} className="text-sm font-medium text-blue-600 hover:underline">+ Add another item</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Discount</Label>
                <div className="flex gap-2"><Input type="number" value={discVal} onChange={(e) => setDiscVal(e.target.value)} placeholder="0" className="h-11" />
                  <Select value={discType} onValueChange={setDiscType}><SelectTrigger className="h-11 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="flat">₹</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent></Select></div></div>
              <div className="space-y-1.5"><Label>Payment mode</Label>
                <Select value={payMode} onValueChange={setPayMode}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {payType === 'partial' && (
              <div className="space-y-1.5"><Label>Amount paid now (₹)</Label><Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" className="h-11" /></div>
            )}

            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="num-tabular">{inr(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Discount</span><span className="num-tabular">− {inr(discount)}</span></div>}
              <div className="flex justify-between items-center pt-1"><span className="font-medium text-slate-600">Total</span><span className="text-2xl font-extrabold text-slate-900 num-tabular">{inr(grand)}</span></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">{saving ? 'Saving…' : 'Record Sale'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
