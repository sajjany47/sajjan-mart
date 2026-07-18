import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

const FOOTER_LINKS = [
  {
    title: 'Shop',
    links: [
      { href: '/category/food', label: 'Food' },
      { href: '/puja', label: 'Puja Samagri' },
      { href: '/category/natural-products', label: 'Natural Products' },
      { href: '/category/general', label: 'General' },
      { href: '/shop', label: 'All Products' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/account', label: 'My Account' },
      { href: '/account/orders', label: 'Orders' },
      { href: '/account/wishlist', label: 'Wishlist' },
      { href: '/account/addresses', label: 'Addresses' },
      { href: '/account/support', label: 'Support' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/faqs', label: 'FAQs' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="container-px mx-auto max-w-7xl py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">
                S
              </div>
              <span className="font-display text-xl font-semibold">Sajjan Mart</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              One platform for fresh food, complete puja packages, organic natural products, and everyday shopping.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@sajjanmart.com</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> +91 98765 43210</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Mumbai, India</div>
            </div>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Sajjan Mart. All rights reserved.</p>
          <p>Payments: COD · Razorpay · Cashfree</p>
        </div>
      </div>
    </footer>
  );
}
