import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Store, LayoutDashboard, Package, ShoppingCart, Truck, Receipt, Wallet,
  BookUser, Users, BarChart3, LogOut, Menu, Settings as Cog, Landmark,
  SlidersHorizontal, RotateCcw, CalendarCheck, History, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';

const nav = (role) => [
  { title: null, items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { title: 'Inventory', items: [
    { to: '/products', label: 'Products', icon: Package },
    { to: '/stock-adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal },
  ]},
  { title: 'Billing & Sales', items: [
    { to: '/sales', label: 'Billing & Sales', icon: ShoppingCart },
    { to: '/purchases', label: 'Purchases', icon: Truck },
    { to: '/returns', label: 'Returns', icon: RotateCcw },
    ...(role === 'owner' ? [{ to: '/expenses', label: 'Expenses', icon: Receipt }] : []),
  ]},
  { title: 'Finance', items: [
    ...(role === 'owner' ? [
      { to: '/ledger', label: 'Credit Ledger', icon: BookUser },
      { to: '/working-capital', label: 'Working Capital', icon: Wallet },
      { to: '/capital', label: 'Capital', icon: Landmark },
    ] : []),
    { to: '/day-close', label: 'Day-End Cash', icon: CalendarCheck },
  ]},
  { title: 'Contacts', items: [
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/contacts', label: 'Suppliers & Categories', icon: BookUser },
  ]},
  ...(role === 'owner' ? [{ title: 'Reports', items: [{ to: '/reports', label: 'Reports', icon: BarChart3 }] }] : []),
  ...(role === 'owner' ? [{ title: 'Administration', items: [
    { to: '/team', label: 'Team', icon: Users },
    { to: '/settings', label: 'Shop Settings', icon: Cog },
    { to: '/activity', label: 'Activity Log', icon: History },
  ]}] : []),
];

export default function Layout() {
  const { user, logout, lowCount, refreshLow } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => { refreshLow(); }, [refreshLow]);

  const doLogout = () => { logout(); navigate('/login'); };
  const groups = nav(user?.role);

  const Inner = () => (
    <div className="flex flex-col h-full">
      <div className="brand-gradient text-white px-5 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shadow"><Store className="h-5 w-5" /></div>
        <div><div className="font-bold leading-tight">Shop ERP</div><div className="text-blue-200 text-xs">Retail Console</div></div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</div>}
            <div className="space-y-1">
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <it.icon className="h-[18px] w-[18px]" />{it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">{user?.name?.[0] || 'U'}</div>
          <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-slate-800 truncate">{user?.name}</div><div className="text-xs text-slate-400 capitalize">{user?.role}</div></div>
          <button onClick={doLogout} className="text-slate-400 hover:text-red-500" title="Sign out"><LogOut className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col fixed inset-y-0"><Inner /></aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl"><Inner /></aside>
        </div>
      )}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden text-slate-600"><Menu className="h-6 w-6" /></button>
            <span className="lg:hidden font-bold">Shop ERP</span>
          </div>
          <Link to="/products" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${lowCount > 0 ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-slate-400'}`}>
            <AlertTriangle className="h-4 w-4" />
            {lowCount > 0 ? `${lowCount} low on stock` : 'Stock OK'}
          </Link>
        </header>
        <main className="flex-1 p-5 sm:p-8 max-w-[1200px] w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
