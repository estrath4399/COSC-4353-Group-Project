import { createContext, useContext, useState, useCallback } from 'react';
import * as api from '../mock/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('queuesmart_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password);
    if (u) {
      setUser(u);
      sessionStorage.setItem('queuesmart_user', JSON.stringify(u));
      return u;
    }
    return null;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const u = await api.register(email, password, name);
    if (u) {
      setUser(u);
      sessionStorage.setItem('queuesmart_user', JSON.stringify(u));
      return u;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('queuesmart_user');
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
