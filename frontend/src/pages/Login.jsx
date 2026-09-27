import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Store, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login, firstRun, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | first-run | forgot | reset
  const [hasOwner, setHasOwner] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
  useEffect(() => {
    api.get('/auth/status').then((r) => {
      setHasOwner(r.data.has_owner);
      if (!r.data.has_owner) setMode('first-run');
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') { await login(form.email, form.password); navigate('/'); }
      else if (mode === 'first-run') { await firstRun(form.name, form.email, form.password); toast.success('Owner account created'); navigate('/'); }
      else if (mode === 'forgot') {
        const r = await api.post('/auth/forgot', { email: form.email });
        if (r.data.reset_token) { setResetToken(r.data.reset_token); setMode('reset'); toast.success('Reset link ready — set a new password'); }
        else { toast.error('No account found with that email'); }
      } else if (mode === 'reset') {
        await api.post('/auth/reset', { token: resetToken, password: newPass });
        toast.success('Password updated. Please sign in.'); setMode('login');
      }
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  const titles = { login: 'Sign in', 'first-run': 'Create your Owner account', forgot: 'Reset password', reset: 'Set a new password' };
  const subs = { login: 'Access your shop dashboard', 'first-run': 'This will be the shop owner with full access', forgot: "Enter your email and we'll help you reset", reset: 'Choose a new password for your account' };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex flex-col justify-between w-1/2 brand-gradient text-white p-10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg"><Store className="h-6 w-6" /></div>
          <div><div className="font-bold text-lg leading-tight">Shop ERP</div><div className="text-blue-200 text-sm">Retail Operations Console</div></div>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">Run your shop like a pro — from stock to cash to capital.</h1>
          <p className="mt-5 text-blue-100 text-lg leading-relaxed">Track products, purchases, sales, expenses and your working capital in one place. Everything in ₹.</p>
        </div>
        <div className="text-blue-200 text-sm">© 2026 Shop ERP</div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center"><Store className="h-5 w-5 text-white" /></div>
            <div className="font-bold text-lg">Shop ERP</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{titles[mode]}</h2>
          <p className="text-slate-500 mt-1">{subs[mode]}</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === 'first-run' && (
              <div className="space-y-1.5"><Label>Your name</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ramesh Sharma" className="h-11" required /></div>
            )}
            {mode !== 'reset' && (
              <div className="space-y-1.5"><Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" className="h-11" required /></div>
            )}
            {(mode === 'login' || mode === 'first-run') && (
              <div className="space-y-1.5">
                <div className="flex justify-between"><Label>Password</Label>
                  {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="text-xs text-blue-600 hover:underline">Forgot password?</button>}
                </div>
                <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="h-11" required /></div>
            )}
            {mode === 'reset' && (
              <div className="space-y-1.5"><Label>New password</Label>
                <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="h-11" required /></div>
            )}
            <Button type="submit" disabled={busy} className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              {mode === 'first-run' ? <UserPlus className="h-5 w-5 mr-1" /> : <LogIn className="h-5 w-5 mr-1" />}
              {busy ? 'Please wait…' : titles[mode]}
            </Button>
          </form>

          {(mode === 'login' || mode === 'first-run') && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs text-slate-400 font-medium">OR</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              {/* REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH */}
              <Button type="button" variant="outline" onClick={() => {
                const redirectUrl = window.location.origin + '/';
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }} className="w-full h-12 text-base font-medium border-slate-200">
                <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4 mr-2" /> Continue with Google
              </Button>
            </>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button onClick={() => setMode('login')} className="mt-4 text-sm text-slate-500 hover:underline">← Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
