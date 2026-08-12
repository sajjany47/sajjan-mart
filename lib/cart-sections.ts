import {
  Flower2,
  Leaf,
  Package,
  Sparkles,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { CartItem } from '@/lib/types';

const SECTION_ORDER: Record<string, number> = {
  food: 0,
  natural: 1,
  puja_samagri: 2,
  puja: 3,
  general: 4,
};

interface SectionStyle {
  label: string;
  icon: LucideIcon;
  badge: string;
  header: string;
  card: string;
}

const SECTION_STYLES: Record<string, SectionStyle> = {
  food: {
    label: 'Food',
    icon: Utensils,
    badge: 'bg-warning/15 text-warning',
    header: 'bg-warning/15 border-warning/20',
    card: 'bg-warning/5',
  },
  natural: {
    label: 'Natural Products',
    icon: Leaf,
    badge: 'bg-primary/10 text-primary',
    header: 'bg-primary/10 border-primary/20',
    card: 'bg-primary/5',
  },
  puja_samagri: {
    label: 'Puja Samagri',
    icon: Flower2,
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
    header: 'bg-purple-100/70 border-purple-200/60 dark:bg-purple-500/10 dark:border-purple-500/20',
    card: 'bg-purple-500/5',
  },
  puja: {
    label: 'Puja Booking',
    icon: Sparkles,
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
    header: 'bg-indigo-100/70 border-indigo-200/60 dark:bg-indigo-500/10 dark:border-indigo-500/20',
    card: 'bg-indigo-500/5',
  },
  general: {
    label: 'General Products',
    icon: Package,
    badge: 'bg-muted text-muted-foreground',
    header: 'bg-muted/60 border-border',
    card: 'bg-muted/30',
  },
};

const DEFAULT_STYLE: SectionStyle = {
  label: 'General Products',
  icon: Package,
  badge: 'bg-muted text-muted-foreground',
  header: 'bg-muted/60 border-border',
  card: 'bg-muted/30',
};

export function sectionKey(item: CartItem): string {
  if (item.type === 'puja') return 'puja';
  return item.productType || 'general';
}

export function groupItemsBySection(items: CartItem[]) {
  const groups = new Map<string, CartItem[]>();
  for (const item of items) {
    const key = sectionKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries())
    .sort((a, b) => (SECTION_ORDER[a[0]] ?? 99) - (SECTION_ORDER[b[0]] ?? 99))
    .map(([key, sectionItems]) => {
      const style = SECTION_STYLES[key] ?? DEFAULT_STYLE;
      return {
        key,
        label: style.label,
        icon: style.icon,
        badge: style.badge,
        header: style.header,
        card: style.card,
        items: sectionItems,
      };
    });
}