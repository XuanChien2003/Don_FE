import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken as persistToken } from '../api/client';
import { login as loginApi } from '../api/auth';

const USER_KEY = 'nxc_user';
const AuthContext = createContext(null);

function loadStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  const [token, setTokenState] = useState(getToken);

  const logout = useCallback(() => {
    persistToken(null);
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      logout();
    }
    window.addEventListener('nxc:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('nxc:unauthorized', handleUnauthorized);
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const result = await loginApi({ username, password });
    // FE (Web Admin) is only for admin/partner - scanner belongs on the PDA app (see PROJECT_CONTEXT.md section 1).
    if (result.user.role === 'scanner') {
      throw new Error('Tài khoản scanner vui lòng đăng nhập trên App quét mã, không dùng được ở web này.');
    }
    persistToken(result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setTokenState(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: !!token, login, logout }),
    [user, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
