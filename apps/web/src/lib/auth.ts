/**
 * 認証ユーティリティ
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@nintei/shared';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  preferredLanguage: string;
  timezone: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
    }
  )
);

export function getToken(): string | null {
  return useAuth.getState().token;
}

export function isAuthenticated(): boolean {
  return useAuth.getState().isAuthenticated();
}
