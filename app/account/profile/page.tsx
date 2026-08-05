'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Mail, User as UserIcon, Phone } from 'lucide-react';

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

      <form onSubmit={save} className="mt-6 max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" value={user?.email ?? ''} disabled className="pl-9" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <div className="relative mt-1">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <div className="relative mt-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
