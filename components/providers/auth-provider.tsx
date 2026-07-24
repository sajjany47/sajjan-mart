'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import type { Profile, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: { id: string; email: string; name?: string | null; image?: string | null } | null;
  session: any;
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
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  async function loadProfile(userId: string) {
    try {
      const res = await fetch(`/api/profiles/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadProfile((session.user as any).id);
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [session]);

  const user = session?.user
    ? { id: (session.user as any).id, email: session.user.email!, name: session.user.name, image: session.user.image }
    : null;

  async function signIn(email: string, password: string) {
    const result = await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { error: result?.error ?? null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        return { error: error ?? 'Registration failed' };
      }
      return { error: null };
    } catch {
      return { error: 'Registration failed' };
    }
  }

  async function signOut() {
    await nextAuthSignOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        loading: status === 'loading' || profileLoading,
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
