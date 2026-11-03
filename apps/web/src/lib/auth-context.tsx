'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setTokens, clearTokens } from './api';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  status: string;
  created_at?: string;
  updated_at?: string;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const accessToken = localStorage.getItem('mf_access_token');
    if (!accessToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await api.user.getProfile();
      setUser(profile);
      setToken(accessToken);
      localStorage.setItem('mf_user', JSON.stringify(profile));
    } catch {
      // Token might be invalid or network error
      clearTokens();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial mount restore from localStorage
    const savedUser = localStorage.getItem('mf_user');
    const savedToken = localStorage.getItem('mf_access_token');

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        // ignore parse error
      }
    }

    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.auth.login(email, password);
    setTokens(res.accessToken, res.refreshToken);
    localStorage.setItem('mf_user', JSON.stringify(res.user));
    setUser(res.user);
    setToken(res.accessToken);
    return res.user;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const res = await api.auth.register(name, email, password);
    setTokens(res.accessToken, res.refreshToken);
    localStorage.setItem('mf_user', JSON.stringify(res.user));
    setUser(res.user);
    setToken(res.accessToken);
    return res.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('mf_refresh_token') || undefined;
    try {
      await api.auth.logout(refreshToken);
    } catch {
      // best-effort logout
    } finally {
      clearTokens();
      setUser(null);
      setToken(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

