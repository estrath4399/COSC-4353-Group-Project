import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from '../mock/api';

const AuthContext = createContext(null);

async function fetchMe() {
  const raw = sessionStorage.getItem('queuesmart_session');
  if (!raw) return null;
  let token;
  try {
    token = JSON.parse(raw).token;
  } catch {
    return null;
  }
  if (!token) return null;
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('queuesmart_session');
      if (!raw) return null;
      const { user: u } = JSON.parse(raw);
      return u ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = sessionStorage.getItem('queuesmart_session');
      if (!raw) return;
      const me = await fetchMe();
      if (cancelled) return;
      if (me) {
        setUser(me);
        try {
          const { token } = JSON.parse(raw);
          sessionStorage.setItem('queuesmart_session', JSON.stringify({ user: me, token }));
        } catch {
          /* ignore */
        }
      } else {
        sessionStorage.removeItem('queuesmart_session');
        setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password);
    if (u) setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const u = await api.register(email, password, name);
    if (u) setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logoutApi();
    } catch {
      /* offline / server down */
    }
    setUser(null);
    sessionStorage.removeItem('queuesmart_session');
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
