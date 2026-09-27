import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { errMsg, API } from '../lib/api';
import { inr } from '../lib/format';
import { Loader, StatusPill } from '../components/common';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Printer, Download, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState({});
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    api.get(`/sales/${id}`).then((r) => setSale(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get('/settings').then((r) => setSettings(r.data)).catch(() => {});
  }, [id]);

  const downloadPdf = async () => {
    try {
      const token = localStorage.getItem('shop_erp_token');
      const res = await fetch(`${API}/invoice/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${sale.invoice_no}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not download PDF'); }
  };

  const showQr = async () => {
    try { const r = await api.get(`/invoice/${id}/upi-qr`); if (!r.data.has_upi) { toast.error('Add a UPI ID in Shop Settings first'); return; } setQr(r.data); setQrOpen(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!sale) return <Loader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <button onClick={() => navigate('/sales')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back to Sales</button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={showQr}><QrCode className="h-4 w-4 mr-1.5" /> UPI QR</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print</Button>
          <Button onClick={downloadPdf} className="bg-orange-500 hover:bg-orange-600 text-white"><Download className="h-4 w-4 mr-1.5" /> Download PDF</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 max-w-3xl mx-auto">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">{settings.name || 'My Shop'}</h2>
            {settings.address && <p className="text-slate-500 text-sm mt-1">{settings.address}</p>}
            {settings.gstin && <p className="text-slate-500 text-sm">GSTIN: {settings.gstin}</p>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900">TAX INVOICE</div>
            <div className="text-sm text-slate-500">{sale.invoice_no}</div>
            <div className="text-sm text-slate-500">{sale.date}</div>
            <div className="mt-1"><StatusPill status={sale.status} /></div>
          </div>
        </div>

        <div className="mt-6 text-sm"><span className="text-slate-400">Bill To</span><div className="font-semibold text-slate-800">{sale.customer?.name || 'Walk-in Customer'}</div>{sale.customer?.phone && <div className="text-slate-500">{sale.customer.phone}</div>}</div>

        <table className="w-full mt-6 text-sm">
          <thead><tr className="text-left text-slate-400 border-b border-slate-200">
            <th className="py-2 font-semibold">Item</th><th className="py-2 font-semibold text-center">Qty</th>
            <th className="py-2 font-semibold text-right">Price</th><th className="py-2 font-semibold text-right">Amount</th>
          </tr></thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="py-2.5 font-medium text-slate-800">{it.name}</td>
                <td className="py-2.5 text-center text-slate-600">{it.qty} {it.unit}</td>
                <td className="py-2.5 text-right num-tabular text-slate-600">{inr(it.price, true)}</td>
                <td className="py-2.5 text-right num-tabular font-semibold">{inr(it.qty * it.price, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="num-tabular">{inr(sale.subtotal, true)}</span></div>
          {sale.discount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span className="num-tabular">− {inr(sale.discount, true)}</span></div>}
          {sale.tax_amount > 0 && <div className="flex justify-between text-slate-500"><span>Tax ({sale.tax_percent}%)</span><span className="num-tabular">{inr(sale.tax_amount, true)}</span></div>}
          <div className="flex justify-between text-lg font-extrabold text-slate-900 border-t border-slate-200 pt-2"><span>Grand Total</span><span className="num-tabular">{inr(sale.total, true)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Paid ({sale.payment_mode})</span><span className="num-tabular">{inr(sale.amount_paid, true)}</span></div>
          {sale.balance_due > 0 && <div className="flex justify-between font-bold text-red-500"><span>Balance Due</span><span className="num-tabular">{inr(sale.balance_due, true)}</span></div>}
        </div>
        <p className="mt-8 text-center text-slate-400 text-sm">Thank you for your business!</p>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Scan to pay via UPI</DialogTitle></DialogHeader>
          {qr && <div className="flex flex-col items-center gap-3 py-2"><img src={qr.qr} alt="UPI QR" className="h-56 w-56" /><div className="text-2xl font-extrabold num-tabular">{inr(qr.amount)}</div><p className="text-xs text-slate-400 text-center">Payment is recorded manually after you confirm receipt.</p></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
