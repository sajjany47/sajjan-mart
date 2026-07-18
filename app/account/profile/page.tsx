'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone })
      .eq('id', user.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      await refreshProfile();
      toast.success('Profile updated');
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">My Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update your personal information.</p>

      <form onSubmit={save} className="mt-6 max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ''} disabled className="mt-1" />
          <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
