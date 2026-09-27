import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Invoice from './pages/Invoice';
import Contacts from './pages/Contacts';
import Customers from './pages/Customers';
import CreditLedger from './pages/CreditLedger';
import WorkingCapital from './pages/WorkingCapital';
import Capital from './pages/Capital';
import Expenses from './pages/Expenses';
import StockAdjustments from './pages/StockAdjustments';
import Returns from './pages/Returns';
import DayClose from './pages/DayClose';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Team from './pages/Team';
import ActivityLog from './pages/ActivityLog';
import Forbidden from './pages/Forbidden';

function Protected({ children, ownerOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (ownerOnly && user.role !== 'owner') return <Forbidden />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="sales" element={<Sales />} />
              <Route path="sales/:id" element={<Invoice />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="customers" element={<Customers />} />
              <Route path="stock-adjustments" element={<StockAdjustments />} />
              <Route path="returns" element={<Returns />} />
              <Route path="day-close" element={<DayClose />} />
              {/* owner-only */}
              <Route path="ledger" element={<Protected ownerOnly><CreditLedger /></Protected>} />
              <Route path="working-capital" element={<Protected ownerOnly><WorkingCapital /></Protected>} />
              <Route path="capital" element={<Protected ownerOnly><Capital /></Protected>} />
              <Route path="expenses" element={<Protected ownerOnly><Expenses /></Protected>} />
              <Route path="reports" element={<Protected ownerOnly><Reports /></Protected>} />
              <Route path="settings" element={<Protected ownerOnly><Settings /></Protected>} />
              <Route path="team" element={<Protected ownerOnly><Team /></Protected>} />
              <Route path="activity" element={<Protected ownerOnly><ActivityLog /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </AuthProvider>
  );
}

export default App;
