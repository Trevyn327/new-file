import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { PageHeader, Card, Loader, Empty, Pill } from '../components/common';
import { History } from 'lucide-react';
import { toast } from 'sonner';

export default function ActivityLog() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/activity').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!list) return <Loader />;

  const fmt = (ts) => { try { return new Date(ts).toLocaleString('en-IN'); } catch { return ts; } };

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Who did what, and when" />
      <Card>
        <div className="divide-y divide-slate-50">
          {list.length === 0 && <Empty text="No activity recorded yet." />}
          {list.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><History className="h-4 w-4" /></div>
                <div><div className="font-semibold text-slate-800 capitalize">{a.action} {a.entity}</div><div className="text-xs text-slate-400">{a.user_name} · {fmt(a.timestamp)}</div></div>
              </div>
              <Pill>{a.entity}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
