'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      setLoading(false);
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || 'Failed to update password');
      } else {
        toast.success('Password updated. Please sign in.');
        router.push('/login');
      }
    } catch {
      setLoading(false);
      toast.error('Failed to update password');
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your new password below.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </>
  );
}
