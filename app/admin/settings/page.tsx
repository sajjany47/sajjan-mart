'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Store-wide configuration.</p>

      <div className="mt-6 max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="store">Store Name</Label>
          <Input id="store" defaultValue="Sajjan Mart" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="support-email">Support Email</Label>
          <Input id="support-email" defaultValue="support@sajjanmart.com" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="support-phone">Support Phone</Label>
          <Input id="support-phone" defaultValue="+91 98765 43210" className="mt-1" />
        </div>
        <Button onClick={() => toast.success('Settings saved (demo)')}>Save settings</Button>
      </div>

      <div className="mt-6 max-w-md rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Integrations</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Cloudinary - image storage (configure via env)</li>
          <li>Razorpay - payments (configure via env)</li>
          <li>Cashfree - payments (configure via env)</li>
          <li>Nodemailer - transactional email (configure via env)</li>
          <li>OpenSearch - product search (configure via env)</li>
        </ul>
      </div>
    </div>
  );
}
