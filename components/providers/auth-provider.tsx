'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Profile, UserRole } from '@/lib/types';

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setUser(null);
        setProfile(null);
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        const profileRes = await fetch(`/api/profiles/${data.user.id}`);
        if (profileRes.ok) {
          setProfile(await profileRes.json());
        }
      }
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? 'Login failed' };
      setUser(data.user);
      await loadProfile();
      return { error: null };
    } catch {
      return { error: 'Login failed' };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? 'Registration failed' };
      return { error: null };
    } catch {
      return { error: 'Registration failed' };
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    await loadProfile();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
