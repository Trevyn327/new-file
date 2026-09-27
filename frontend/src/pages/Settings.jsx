import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { PageHeader, Card, Loader } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));

  useEffect(() => { api.get('/settings').then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e))); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        name: s.name, address: s.address, gstin: s.gstin, tax_percent: Number(s.tax_percent) || 0,
        invoice_prefix: s.invoice_prefix || 'INV-', upi_id: s.upi_id,
      });
      toast.success('Settings saved');
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  if (!s) return <Loader />;

  return (
    <div>
      <PageHeader title="Shop Settings" subtitle="Details that appear on your invoices" />
      <Card className="max-w-2xl">
        <div className="p-6 space-y-5">
          <div className="space-y-1.5"><Label>Shop name</Label><Input value={s.name} onChange={(e) => set('name', e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label>Address</Label><Input value={s.address} onChange={(e) => set('address', e.target.value)} className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>GSTIN (optional)</Label><Input value={s.gstin} onChange={(e) => set('gstin', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Tax %</Label><Input type="number" value={s.tax_percent} onChange={(e) => set('tax_percent', e.target.value)} className="h-11" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Invoice prefix</Label><Input value={s.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>UPI ID (for QR)</Label><Input value={s.upi_id} onChange={(e) => set('upi_id', e.target.value)} placeholder="name@bank" className="h-11" /></div>
          </div>
          <div className="pt-2"><Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-6">{saving ? 'Saving…' : 'Save Settings'}</Button></div>
        </div>
      </Card>
    </div>
  );
}
