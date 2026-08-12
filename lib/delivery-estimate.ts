function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getDeliveryEstimate(section: string): { title: string; detail: string } {
  if (section === 'food') {
    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return {
      title: 'Delivery within 2 hours',
      detail: `Today, ${fmtTime(now)} – ${fmtTime(end)}`,
    };
  }
  return {
    title: 'Standard delivery',
    detail: `Estimated ${fmtDay(addDays(new Date(), 1))} – ${fmtDay(addDays(new Date(), 4))} (1-4 days)`,
  };
}

export const QUICK_SERVICE_CONTACT = 'For quick service contact sajjany47@gmail.com / 8981374643 (Call / WhatsApp support)';