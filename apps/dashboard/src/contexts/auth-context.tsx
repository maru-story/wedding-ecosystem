'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  type AuthUser,
  getStoredUser,
  isAuthenticated,
  logout,
  login as authLogin,
  updateStoredUser,
} from '@/lib/auth';
import { startAutoRefresh, stopAutoRefresh } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    if (isAuthenticated()) {
      const storedUser = getStoredUser();
      setUser(storedUser);
      startAutoRefresh();
    }
    setIsLoading(false);

    return () => {
      stopAutoRefresh();
    };
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const response = await authLogin(email, password);
    setUser(response.user);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    logout();
  }, []);

  const handleUpdateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
    updateStoredUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        login: handleLogin,
        logout: handleLogout,
        updateUser: handleUpdateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
