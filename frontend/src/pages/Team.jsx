import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../lib/api';
import { PageHeader, Card, Loader, Empty, Pill } from '../components/common';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, KeyRound, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function Team() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get('/auth/staff').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Fill all fields'); return; }
    try { await api.post('/auth/staff', form); toast.success('Team member added'); setForm({ name: '', email: '', password: '', role: 'employee' }); setOpen(false); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const doReset = async () => {
    if (!newPass) { toast.error('Enter a new password'); return; }
    try { await api.post(`/auth/staff/${resetFor.id}/reset-password`, { password: newPass }); toast.success('Password reset'); setResetFor(null); setNewPass(''); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const toggle = async (u) => { try { await api.post(`/auth/staff/${u.id}/toggle`); load(); } catch (e) { toast.error(errMsg(e)); } };

  if (!list) return <Loader />;

  return (
    <div>
      <PageHeader title="Team" subtitle="Owner and employees who can use this shop" actionLabel="Add Member" actionIcon={Plus} onAction={() => setOpen(true)} />
      <Card>
        <div className="divide-y divide-slate-50">
          {list.length === 0 && <Empty text="No team members yet." />}
          {list.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">{u.name?.[0]}</div>
                <div><div className="font-semibold text-slate-800">{u.name} {!u.active && <span className="text-xs text-red-500">(disabled)</span>}</div><div className="text-xs text-slate-400">{u.email}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <Pill tone={u.role === 'owner' ? 'orange' : 'blue'}>{u.role}</Pill>
                <Button size="sm" variant="outline" onClick={() => { setResetFor(u); setNewPass(''); }}><KeyRound className="h-4 w-4" /></Button>
                {u.role !== 'owner' && <Button size="sm" variant="outline" onClick={() => toggle(u)}><Power className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="h-11" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="h-11" /></div>
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => set('role', v)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="owner">Owner</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(v) => !v && setResetFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reset password{resetFor ? ` — ${resetFor.name}` : ''}</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-1"><Label>New password</Label><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="h-11" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setResetFor(null)}>Cancel</Button><Button onClick={doReset} className="bg-orange-500 hover:bg-orange-600 text-white">Reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
