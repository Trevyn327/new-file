import React, { useEffect, useState, useRef } from 'react';
import api, { errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { inr } from '../lib/format';
import { PageHeader, Pill, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Package, Download, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const empty = { sku: '', name: '', category_id: '', unit: 'pcs', selling_price: '', purchase_price: '', opening_stock: '', image_url: '', low_stock_threshold: '5', barcode: '' };

export default function Products() {
  const { refreshLow } = useAuth();
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => {
    api.get('/products').then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const filtered = (items || []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase()));

  const download = async (path, filename) => {
    try { const r = await api.get(path, { responseType: 'blob' }); const u = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u); }
    catch { toast.error('Download failed'); }
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api.post('/products/import', fd);
      setImportResult(r.data); toast.success(`Imported: ${r.data.added} added, ${r.data.updated} updated`); load(); refreshLow();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    if (!form.name || form.selling_price === '') { toast.error('Add a name and selling price'); return; }
    setSaving(true);
    try {
      await api.post('/products', {
        sku: form.sku, name: form.name, category_id: form.category_id || null, unit: form.unit,
        barcode: form.barcode, selling_price: Number(form.selling_price), purchase_price: Number(form.purchase_price) || 0,
        opening_stock: Number(form.opening_stock) || 0, image_url: form.image_url, low_stock_threshold: Number(form.low_stock_threshold) || 5,
      });
      toast.success('Product added'); setForm(empty); setAdvanced(false); setOpen(false); load(); refreshLow();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  if (!items) return <Loader />;

  return (
    <div>
      <PageHeader title="Products" subtitle="Everything you stock and sell" actionLabel="Add Product" actionIcon={Plus} onAction={() => setOpen(true)}>
        <Button variant="outline" className="h-11" onClick={() => download('/products/template.csv', 'product_template.csv')}><FileText className="h-4 w-4 mr-1.5" /> CSV Template</Button>
        <Button variant="outline" className="h-11" onClick={() => download('/export/products.xlsx', 'products.xlsx')}><Download className="h-4 w-4 mr-1.5" /> Export Excel</Button>
        <Button variant="outline" className="h-11" onClick={() => { setImportResult(null); setImportOpen(true); }}><Upload className="h-4 w-4 mr-1.5" /> Import CSV / Excel</Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU..." className="pl-9 h-11 bg-white" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? <Empty text="No products yet. Add one or import a file to get started." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">In Stock</th>
              <th className="px-5 py-3 font-semibold">Cost (avg)</th><th className="px-5 py-3 font-semibold">Sell Price</th>
              <th className="px-5 py-3 font-semibold text-right">Stock Value</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Package className="h-4 w-4" /></div>}
                    <div><div className="font-semibold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.sku}{p.category_name ? ` · ${p.category_name}` : ''}</div></div>
                  </div></td>
                  <td className="px-5 py-3.5"><span className="text-lg font-bold text-slate-900 num-tabular">{p.stock}</span><span className="text-slate-400 text-xs ml-1">{p.unit}</span>{p.low && <div className="mt-0.5"><Pill tone="red">Low</Pill></div>}</td>
                  <td className="px-5 py-3.5 num-tabular text-slate-600">{inr(p.avg_cost, true)}</td>
                  <td className="px-5 py-3.5 num-tabular font-semibold text-slate-900">{inr(p.selling_price)}</td>
                  <td className="px-5 py-3.5 num-tabular font-bold text-slate-900 text-right">{inr(p.stock_value)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Product name</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Basmati Rice 5kg" className="h-11" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Selling price (₹)</Label><Input type="number" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} placeholder="0" className="h-11" /></div>
              <div className="space-y-1.5"><Label>Opening stock</Label><Input type="number" value={form.opening_stock} onChange={(e) => set('opening_stock', e.target.value)} placeholder="0" className="h-11" /></div>
            </div>
            <button type="button" onClick={() => setAdvanced((a) => !a)} className="text-sm font-medium text-blue-600 hover:underline">{advanced ? 'Hide advanced options' : 'Advanced options'}</button>
            {advanced && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Cost price (₹)</Label><Input type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="0" className="h-11" /></div>
                  <div className="space-y-1.5"><Label>Unit</Label>
                    <Select value={form.unit} onValueChange={(v) => set('unit', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>{['pcs', 'kg', 'box', 'meter', 'dozen'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => set('category_id', v)}><SelectTrigger className="h-11"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Alert below</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} className="h-11" /></div>
                </div>
                <div className="space-y-1.5"><Label>SKU (optional)</Label><Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="auto if blank" className="h-11" /></div>
                <div className="space-y-1.5"><Label>Barcode (optional)</Label><Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className="h-11" /></div>
                <div className="space-y-1.5"><Label>Image URL (optional)</Label><Input value={form.image_url} onChange={(e) => set('image_url', e.target.value)} className="h-11" />
                  {form.image_url && <img src={form.image_url} alt="preview" className="mt-2 h-16 w-16 rounded-lg object-cover border" onError={(e) => { e.target.style.display = 'none'; }} />}</div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">{saving ? 'Saving…' : 'Save Product'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Import Products</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-slate-500">Upload a CSV or Excel (.xlsx) file. Products are matched by SKU — existing ones update, new ones are created. Download the CSV template first if unsure.</p>
            <Button variant="outline" className="w-full" onClick={() => download('/products/template.csv', 'product_template.csv')}><FileText className="h-4 w-4 mr-1.5" /> Download CSV Template</Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={doImport} className="block w-full text-sm text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-white file:font-semibold hover:file:bg-orange-600 file:cursor-pointer" />
            {importing && <p className="text-sm text-slate-500">Importing…</p>}
            {importResult && (
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Added</span><span className="font-bold text-emerald-600">{importResult.added}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Updated</span><span className="font-bold text-blue-600">{importResult.updated}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Failed</span><span className="font-bold text-red-500">{importResult.failed.length}</span></div>
                {importResult.failed.length > 0 && <div className="pt-2 border-t border-slate-200 text-xs text-red-500 space-y-0.5">{importResult.failed.slice(0, 5).map((f, i) => <div key={i}>Row {f.row}: {f.reason}</div>)}</div>}
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
