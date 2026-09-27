import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, StatCard, Card, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CreditLedger() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState('customer');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');

  const load = () => api.get('/ledger').then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const openFor = (direction, id) => { setDir(direction); setPartyId(id); setAmount(''); setMode('Cash'); setOpen(true); };

  const save = async () => {
    if (!partyId) { toast.error('Choose a party'); return; }
    if (!(Number(amount) > 0)) { toast.error('Enter an amount'); return; }
    try {
      await api.post('/payments', { direction: dir, party_id: partyId, amount: Number(amount), mode });
      toast.success('Payment recorded'); setOpen(false); load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!data) return <Loader />;
  const partyList = dir === 'customer' ? data.customers : data.suppliers;

  return (
    <div>
      <PageHeader title="Credit Ledger" subtitle="Who owes you, and who you owe" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Customers Owe Us" value={inr(data.customers_owe_us)} icon={ArrowDownCircle} tone="green" />
        <StatCard label="We Owe Suppliers" value={inr(data.we_owe_suppliers)} icon={ArrowUpCircle} tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Customers who owe us">
          <div className="divide-y divide-slate-50">
            {data.customers.length === 0 && <Empty text="No pending customer dues." />}
            {data.customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <span className="font-semibold text-slate-800">{c.name}</span>
                <div className="flex items-center gap-3"><span className="text-lg font-bold num-tabular">{inr(c.balance)}</span>
                  <Button size="sm" onClick={() => openFor('customer', c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Collect</Button></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Suppliers we owe">
          <div className="divide-y divide-slate-50">
            {data.suppliers.length === 0 && <Empty text="No pending supplier dues." />}
            {data.suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                <span className="font-semibold text-slate-800">{s.name}</span>
                <div className="flex items-center gap-3"><span className="text-lg font-bold num-tabular">{inr(s.balance)}</span>
                  <Button size="sm" variant="outline" onClick={() => openFor('supplier', s.id)}>Pay</Button></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Payment History" className="mt-6">
        <div className="divide-y divide-slate-50">
          {data.history.length === 0 && <Empty text="No payments recorded yet." />}
          {data.history.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div><div className="font-semibold text-slate-800">{p.party_name}</div><div className="text-xs text-slate-400">{p.date} · {p.mode} · {p.direction === 'customer' ? 'Received' : 'Paid'}</div></div>
              <span className={`text-lg font-bold num-tabular ${p.direction === 'customer' ? 'text-emerald-600' : 'text-red-500'}`}>{p.direction === 'customer' ? '+' : '−'} {inr(p.amount)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{dir === 'customer' ? 'Collect Payment' : 'Pay Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>{dir === 'customer' ? 'Customer' : 'Supplier'}</Label>
              <Select value={partyId} onValueChange={setPartyId}><SelectTrigger className="h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{partyList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({inr(p.balance)})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg font-semibold" /></div>
              <div className="space-y-1.5"><Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
