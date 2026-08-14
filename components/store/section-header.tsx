import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, link, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {action}
        {link && (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary hover:underline"
          >
            {link.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
