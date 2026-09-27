import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, Empty, Loader } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Plus, Trash2, Users, Truck, Tag } from 'lucide-react';
import { toast } from 'sonner';

function PartyTab({ kind }) {
  const isCat = kind === 'category';
  const path = isCat ? '/categories' : (kind === 'customer' ? '/customers' : '/suppliers');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstin: '', opening_balance: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get(path).then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (isCat) await api.post(path, { name: form.name });
      else await api.post(path, { name: form.name, phone: form.phone, address: form.address, gstin: form.gstin, opening_balance: Number(form.opening_balance) || 0 });
      toast.success('Saved'); setForm({ name: '', phone: '', address: '', gstin: '', opening_balance: '' }); setAdvanced(false); setOpen(false); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (idv) => { try { await api.delete(`${path}/${idv}`); toast.success('Deleted'); load(); } catch (e) { toast.error(errMsg(e)); } };

  if (!list) return <Loader />;
  const label = isCat ? 'Category' : (kind === 'customer' ? 'Customer' : 'Supplier');

  return (
    <div>
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="h-4 w-4 mr-1.5" /> Add {label}</Button></div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text={`No ${label.toLowerCase()}s yet.`} /> : (
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-50">
            {list.map((x) => (
              <tr key={x.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5"><div className="font-semibold text-slate-800">{x.name}</div>{!isCat && (x.phone || x.address) && <div className="text-xs text-slate-400">{[x.phone, x.address].filter(Boolean).join(' · ')}</div>}</td>
                {!isCat && <td className="px-5 py-3.5 text-right num-tabular font-bold text-slate-900">{x.balance ? inr(x.balance) : ''}</td>}
                <td className="px-5 py-3.5 text-right w-12"><button onClick={() => remove(x.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add {label}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} className="h-11" /></div>
            {!isCat && (<>
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
            </>)}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Contacts() {
  return (
    <div>
      <PageHeader title="Customers & Suppliers" subtitle="People you sell to and buy from" />
      <Tabs defaultValue="customers">
        <TabsList className="mb-5">
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1.5" /> Customers</TabsTrigger>
          <TabsTrigger value="suppliers"><Truck className="h-4 w-4 mr-1.5" /> Suppliers</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="h-4 w-4 mr-1.5" /> Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="customers"><PartyTab kind="customer" /></TabsContent>
        <TabsContent value="suppliers"><PartyTab kind="supplier" /></TabsContent>
        <TabsContent value="categories"><PartyTab kind="category" /></TabsContent>
      </Tabs>
    </div>
  );
}
