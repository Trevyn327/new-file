import React, { useEffect, useState } from 'react';
import api, { errMsg, API } from '../lib/api';
import { inr } from '../lib/format';
import { PageHeader, StatCard, Card, Loader, Empty } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Download, TrendingUp, ShoppingCart, Boxes, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const [pnl, setPnl] = useState(null);
  const [inv, setInv] = useState(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const loadPnl = () => api.get('/reports/pnl', { params: { start, end } }).then((r) => setPnl(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { loadPnl(); api.get('/reports/inventory-valuation').then((r) => setInv(r.data)).catch(() => {}); }, []); // eslint-disable-line

  const dl = async (path, name) => {
    try {
      const token = localStorage.getItem('shop_erp_token');
      const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  if (!pnl) return <Loader />;
  const rows = [
    { label: 'Sales', value: pnl.sales, tone: 'text-slate-900' },
    { label: 'Cost of Goods Sold (weighted avg)', value: -pnl.cogs, tone: 'text-red-500' },
    { label: 'Gross Profit', value: pnl.gross_profit, tone: 'text-slate-900', bold: true },
    { label: 'Expenses', value: -pnl.expenses, tone: 'text-red-500' },
    { label: 'Net Profit', value: pnl.net_profit, tone: 'text-emerald-600', bold: true },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="A simple picture of how the shop is doing" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sales" value={inr(pnl.sales)} icon={ShoppingCart} tone="orange" />
        <StatCard label="Gross Profit" value={inr(pnl.gross_profit)} icon={TrendingUp} tone="green" />
        <StatCard label="Net Profit" value={inr(pnl.net_profit)} icon={TrendingUp} tone="blue" />
        <StatCard label="Stock at Cost" value={inr(inv?.total || 0)} icon={Boxes} tone="slate" />
      </div>

      <Card title="Profit & Loss" action={(
        <div className="flex items-end gap-2">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-36" />
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-36" />
          <Button size="sm" onClick={loadPnl} className="bg-blue-600 hover:bg-blue-700 text-white h-9">Apply</Button>
        </div>
      )}>
        <div className="divide-y divide-slate-50">
          {rows.map((r) => (
            <div key={r.label} className={`flex items-center justify-between px-5 py-3.5 ${r.bold ? 'bg-slate-50' : ''}`}>
              <span className={`${r.bold ? 'font-bold text-slate-800' : 'text-slate-600'} text-sm`}>{r.label}</span>
              <span className={`num-tabular ${r.bold ? 'text-xl font-extrabold' : 'font-semibold'} ${r.tone}`}>{r.value < 0 ? '− ' : ''}{inr(Math.abs(r.value))}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Inventory Valuation" className="mt-6">
        {!inv || inv.rows.length === 0 ? <Empty text="No products to value yet." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Stock</th><th className="px-5 py-3 font-semibold">Avg Cost</th><th className="px-5 py-3 font-semibold text-right">Value</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {inv.rows.map((r) => (<tr key={r.sku}><td className="px-5 py-3 font-medium text-slate-800">{r.name}</td><td className="px-5 py-3 text-slate-600">{r.stock} {r.unit}</td><td className="px-5 py-3 num-tabular text-slate-600">{inr(r.avg_cost, true)}</td><td className="px-5 py-3 text-right num-tabular font-semibold">{inr(r.value)}</td></tr>))}
              <tr className="bg-slate-50"><td className="px-5 py-3 font-bold" colSpan={3}>Total Stock Value</td><td className="px-5 py-3 text-right num-tabular font-extrabold text-lg">{inr(inv.total)}</td></tr>
            </tbody></table></div>
        )}
      </Card>

      <Card title="Export Data" className="mt-6">
        <div className="p-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => dl('/export/sales', 'sales.csv')}><Download className="h-4 w-4 mr-1.5" /> Sales CSV</Button>
          <Button variant="outline" onClick={() => dl('/export/products', 'products.csv')}><Download className="h-4 w-4 mr-1.5" /> Products CSV</Button>
          <Button variant="outline" onClick={() => dl('/export/customers', 'customers.csv')}><Download className="h-4 w-4 mr-1.5" /> Customers CSV</Button>
          <Button variant="outline" onClick={() => dl('/export/backup', 'shop_backup.json')}><Download className="h-4 w-4 mr-1.5" /> Full Backup</Button>
        </div>
      </Card>
    </div>
  );
}
