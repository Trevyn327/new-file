import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { inr } from '../lib/format';
import { PageHeader, Pill, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function Returns() {
  const { refreshLow } = useAuth();
  const [list, setList] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('customer');
  const [partyId, setPartyId] = useState('none');
  const [refundMode, setRefundMode] = useState('Cash');
  const [lines, setLines] = useState([{ product_id: '', qty: 1, price: '' }]);

  const load = () => {
    api.get('/returns').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/products').then((r) => setProducts(r.data)).catch(() => {});
    api.get('/customers').then((r) => setCustomers(r.data)).catch(() => {});
    api.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setKind('customer'); setPartyId('none'); setRefundMode('Cash'); setLines([{ product_id: '', qty: 1, price: '' }]); };
  const updateLine = (i, k, v) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const total = lines.reduce((a, l) => a + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);

  const save = async () => {
    const items = lines.filter((l) => l.product_id && Number(l.qty) > 0).map((l) => ({ product_id: l.product_id, qty: Number(l.qty), price: Number(l.price) || 0 }));
    if (items.length === 0) { toast.error('Add at least one item'); return; }
    try { await api.post('/returns', { kind, party_id: partyId === 'none' ? null : partyId, items, refund_mode: refundMode }); toast.success('Return recorded'); reset(); setOpen(false); load(); refreshLow(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!list) return <Loader />;
  const parties = kind === 'customer' ? customers : suppliers;

  return (
    <div>
      <PageHeader title="Returns" subtitle="Handle items coming back in or going back to suppliers" actionLabel="New Return" actionIcon={Plus} onAction={() => setOpen(true)} />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="No returns yet." /> : (
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center"><RotateCcw className="h-4 w-4" /></div><div><div className="font-semibold text-slate-800">{r.kind === 'customer' ? 'Customer Return' : 'Supplier Return'}</div><div className="text-xs text-slate-400">{r.date} · {r.items.reduce((a, i) => a + i.qty, 0)} items · {r.refund_mode}</div></div></div></td>
                <td className="px-5 py-3.5 text-right"><span className="text-lg font-bold num-tabular">{inr(r.amount)}</span></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Return</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={kind} onValueChange={(v) => { setKind(v); setPartyId('none'); }}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="customer">Customer Return (stock in)</SelectItem><SelectItem value="supplier">Supplier Return (stock out)</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{kind === 'customer' ? 'Customer' : 'Supplier'}</Label>
                <Select value={partyId} onValueChange={setPartyId}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None / Walk-in</SelectItem>{parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Items</Label>
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1"><Select value={l.product_id} onValueChange={(v) => updateLine(i, 'product_id', v)}><SelectTrigger className="h-11"><SelectValue placeholder="Choose product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                  <Input type="number" min="1" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="h-11 w-16" placeholder="Qty" />
                  <Input type="number" value={l.price} onChange={(e) => updateLine(i, 'price', e.target.value)} className="h-11 w-24" placeholder="Price ₹" />
                  <button onClick={() => setLines((ls) => ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setLines((ls) => [...ls, { product_id: '', qty: 1, price: '' }])} className="text-sm font-medium text-blue-600 hover:underline">+ Add item</button>
            </div>
            {kind === 'customer' && (
              <div className="space-y-1.5"><Label>Refund via</Label>
                <Select value={refundMode} onValueChange={setRefundMode}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Cash">Cash refund</SelectItem><SelectItem value="Store Credit">Store credit</SelectItem></SelectContent></Select></div>
            )}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"><span className="font-medium text-slate-600">Return value</span><span className="text-2xl font-extrabold num-tabular">{inr(total)}</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Record Return</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
