import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from '../mock/api';

const AuthContext = createContext(null);

// restore the logged-in user from the backend using the saved session token
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

  try {
    // validate the saved token against the backend
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
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
    // on initial load, try to rehydrate the user session from storage
    (async () => {
      const raw = sessionStorage.getItem('queuesmart_session');
      if (!raw) return;
      const me = await fetchMe();
      if (cancelled) return;

      if (me) {
        // keep React state and sessionStorage in sync with the verified backend user
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

  // log in through the API layer and save the returned user in state
  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password);
    if (u) setUser(u);
    return u;
  }, []);

  // register a new user through the backend, then update local auth state
  const register = useCallback(async (email, password, name, role = 'student') => {
    const result = await api.register(email, password, name, role);
    if (result.ok) {
      setUser(result.user);
      return { ok: true, user: result.user };
    }
    return { ok: false, status: result.status, message: result.message };
  }, []);

  // clear frontend auth state even if the backend logout request fails
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
