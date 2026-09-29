'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye, Loader2, UserX, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

interface AdminUser extends Profile {
  _count?: { orders: number; support_tickets: number };
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:text-purple-300',
  vendor: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  delivery: 'bg-indigo-100 text-indigo-700 dark:text-indigo-300',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (roleFilter) params.set('role', roleFilter);
    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load users');
      } else {
        setUsers(data);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, q === '' ? 0 : 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, roleFilter]);

  async function toggleActive(u: AdminUser) {
    setBusyId(u.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update user status');
        return;
      }
      toast.success(u.is_active ? `"${u.full_name || u.email}" deactivated` : `"${u.full_name || u.email}" activated`);
      load();
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && users.length === 0) return <PageLoader text="Loading users..." />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} user{users.length === 1 ? '' : 's'}. Deactivated users cannot log in or place orders.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone..." className="pl-9" />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
          <option value="vendor">Vendor</option>
          <option value="delivery">Delivery</option>
        </select>
        {busyId && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Orders</th>
              <th className="px-4 py-3 text-left font-medium">Tickets</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={`border-t border-border ${u.is_active ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={ROLE_COLORS[u.role] ?? ''}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">{u._count?.orders ?? 0}</td>
                  <td className="px-4 py-3">{u._count?.support_tickets ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge className={u.is_active ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/users/${u.id}`}>
                        <Button variant="ghost" size="sm" aria-label="View"><Eye className="mr-1 h-4 w-4" /> View</Button>
                      </Link>
                      {u.role !== 'admin' ? (
                        u.is_active ? (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toggleActive(u)} disabled={busyId !== null}>
                            <UserX className="mr-1 h-4 w-4" /> Deactivate
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-success" onClick={() => toggleActive(u)} disabled={busyId !== null}>
                            <UserCheck className="mr-1 h-4 w-4" /> Activate
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}