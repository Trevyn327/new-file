import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('shop_erp_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);
  const [lowCount, setLowCount] = useState(0);

  useEffect(() => {
    // Handle return from Emergent Google auth: URL has #session_id=...
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      const sid = new URLSearchParams(hash.replace('#', '')).get('session_id');
      window.history.replaceState(null, '', window.location.pathname);
      api.post('/auth/google/session', { session_id: sid })
        .then((r) => persist(r.data.token, r.data.user))
        .catch((e) => toast.error(e?.response?.data?.detail || 'Google sign-in failed'))
        .finally(() => setLoading(false));
      return;
    }
    const token = localStorage.getItem('shop_erp_token');
    if (token && !user) {
      api.get('/auth/me').then((r) => {
        setUser(r.data);
        localStorage.setItem('shop_erp_user', JSON.stringify(r.data));
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  const persist = (token, u) => {
    localStorage.setItem('shop_erp_token', token);
    localStorage.setItem('shop_erp_user', JSON.stringify(u));
    setUser(u);
  };

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    persist(r.data.token, r.data.user);
    return r.data.user;
  };

  const firstRun = async (name, email, password) => {
    const r = await api.post('/auth/first-run', { name, email, password });
    persist(r.data.token, r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('shop_erp_token');
    localStorage.removeItem('shop_erp_user');
    setUser(null);
  };

  const refreshLow = useCallback(async () => {
    try {
      const r = await api.get('/products/low-stock');
      setLowCount(r.data.length);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, firstRun, logout, lowCount, refreshLow }}>
      {children}
    </AuthContext.Provider>
  );
}
