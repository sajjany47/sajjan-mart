import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sajjany47@gmail.com';

const STATUS_MAIL: Record<string, { subject: string; heading: string; note: string }> = {
  pending: {
    subject: 'Order received',
    heading: 'We have received your order',
    note: 'Your order is pending confirmation. We will notify you as soon as it is accepted.',
  },
  confirmed: {
    subject: 'Order confirmed',
    heading: 'Your order has been accepted',
    note: 'Good news! Your order has been confirmed and is being prepared.',
  },
  processing: {
    subject: 'Order processing started',
    heading: 'Your order is being processed',
    note: 'We are getting your items ready.',
  },
  packed: {
    subject: 'Order packed',
    heading: 'Your order is packed',
    note: 'Your order has been packed and will be handed over for delivery soon.',
  },
  shipped: {
    subject: 'Order dispatched',
    heading: 'Your order has been dispatched',
    note: 'Your order is on its way. Please keep your phone nearby for delivery updates.',
  },
  delivered: {
    subject: 'Order delivered',
    heading: 'Your order has been delivered',
    note: 'Your order has been delivered. Thank you for shopping with Sajjan Mart!',
  },
  cancelled: {
    subject: 'Order cancelled',
    heading: 'Your order has been cancelled',
    note: 'Your order has been cancelled by the store. If you were not expecting this, please contact support or raise a ticket from your account.',
  },
  refunded: {
    subject: 'Order refunded',
    heading: 'Your order has been refunded',
    note: 'The refund for your order has been processed.',
  },
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

const FROM = `"Sajjan Mart" <${process.env.SMTP_USER || ADMIN_EMAIL}>`;

/** Fire-and-forget mail send — never throws, logs failures. */
async function sendMailSafe(options: { to: string; subject: string; html: string }) {
  try {
    const tx = getTransporter();
    if (!tx) {
      console.warn('[mailer] SMTP not configured — skipped mail:', options.subject);
      return;
    }
    await tx.sendMail({ from: FROM, ...options });
    console.log(`[mailer] Sent "${options.subject}" to ${options.to}`);
  } catch (err) {
    console.error('[mailer] Failed to send mail:', err);
  }
}

type OrderWithDetails = {
  orderNumber: string;
  status: string;
  subtotal: any;
  discount: any;
  shipping: any;
  tax: any;
  total: any;
  paymentMethod: string;
  paymentStatus: string;
  address?: unknown;
  notes?: string | null;
  refundedAmount?: any;
  cancelReason?: string | null;
  user?: { email?: string | null; fullName?: string | null; phone?: string | null } | null;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: any;
    total: any;
    itemType?: string | null;
    variantName?: string | null;
    cancelled?: boolean;
  }>;
};

function money(v: unknown): string {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function addressLines(address: unknown): string {
  if (!address || typeof address !== 'object') return '-';
  const a = address as Record<string, any>;
  const parts = [a.full_name, a.phone, a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean);
  return parts.join(', ') || '-';
}

function itemRows(order: OrderWithDetails): string {
  const items = order.items ?? [];
  if (items.length === 0) return '<li>(no items)</li>';
  return items
    .map(
      (i) =>
        `<li>${i.name}${i.variantName ? ` (${i.variantName})` : ''} &times; ${i.quantity} &mdash; ${money(i.total)}${
          i.cancelled ? ' <strong>[CANCELLED]</strong>' : ''
        }</li>`
    )
    .join('');
}

function summaryRows(order: OrderWithDetails): string {
  return `
    <tr><td>Subtotal</td><td align="right">${money(order.subtotal)}</td></tr>
    ${Number(order.discount) > 0 ? `<tr><td>Discount</td><td align="right">- ${money(order.discount)}</td></tr>` : ''}
    ${Number(order.shipping) > 0 ? `<tr><td>Shipping</td><td align="right">${money(order.shipping)}</td></tr>` : ''}
    ${Number(order.tax) > 0 ? `<tr><td>Tax</td><td align="right">${money(order.tax)}</td></tr>` : ''}
    <tr><td><strong>Total</strong></td><td align="right"><strong>${money(order.total)}</strong></td></tr>
  `;
}

function wrap(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <div style="background:#7c3aed;color:#fff;padding:16px 24px"><h2 style="margin:0">Sajjan Mart</h2></div>
    <div style="padding:24px">
      <h3 style="margin-top:0">${title}</h3>
      ${bodyHtml}
      <p style="color:#888;font-size:12px;margin-top:32px">This is an automated message from Sajjan Mart. Please do not reply.</p>
    </div>
  </div>`;
}

function customerGreeting(order: OrderWithDetails): string {
  return `<p>Hi ${order.user?.fullName || 'there'},</p>`;
}

/** Mail to the customer + admin after a new order is placed. */
export async function sendOrderPlacedMails(order: OrderWithDetails) {
  const to = order.user?.email;
  if (!to) return;

  const detailTable = `
    <p><strong>Order:</strong> #${order.orderNumber}</p>
    <ul>${itemRows(order)}</ul>
    <table style="width:100%;border-collapse:collapse">${summaryRows(order)}</table>
    <p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})</p>
    <p><strong>Delivery address:</strong> ${addressLines(order.address)}</p>
    ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
  `;

  await Promise.all([
    sendMailSafe({
      to,
      subject: `[Sajjan Mart] Order #${order.orderNumber} placed successfully`,
      html: wrap(
        'Thank you for your order!',
        `${customerGreeting(order)}
        <p>Your order has been placed successfully. We will update you at every step — confirmation, dispatch and delivery.</p>
        ${detailTable}`
      ),
    }),
    sendMailSafe({
      to: ADMIN_EMAIL,
      subject: `[Sajjan Mart] NEW ORDER #${order.orderNumber} — ${money(order.total)}`,
      html: wrap(
        'New order received',
        `<p>A new order has been placed on the store.</p>
         <p><strong>Customer:</strong> ${order.user?.fullName || '-'} (${to}${order.user?.phone ? `, ${order.user.phone}` : ''})</p>
         ${detailTable}
         <p>Open the admin panel &rarr; Orders to process it.</p>`
      ),
    }),
  ]);
}

/** Mail to the customer whenever the order status changes. */
export async function sendOrderStatusMail(order: OrderWithDetails, newStatus: string) {
  const to = order.user?.email;
  if (!to) return;
  const tmpl = STATUS_MAIL[newStatus];
  if (!tmpl) return; // cancel_request etc. are handled by their own mails

  await sendMailSafe({
    to,
    subject: `[Sajjan Mart] Order #${order.orderNumber}: ${tmpl.subject}`,
    html: wrap(
      tmpl.heading,
      `${customerGreeting(order)}
      <p>${tmpl.note}</p>
      <p><strong>Order:</strong> #${order.orderNumber}<br/>
      <strong>Status:</strong> ${tmpl.subject}</p>
      <ul>${itemRows(order)}</ul>`
    ),
  });
}

/** Mail to admin when a customer requests cancellation. */
export async function sendCancelRequestMail(order: OrderWithDetails, requestedItemNames: string[]) {
  await sendMailSafe({
    to: ADMIN_EMAIL,
    subject: `[Sajjan Mart] CANCEL REQUEST — Order #${order.orderNumber}`,
    html: wrap(
      'Order cancellation requested',
      `<p><strong>Customer:</strong> ${order.user?.fullName || '-'} (${order.user?.email || '-'})</p>
       <p><strong>Order:</strong> #${order.orderNumber} &mdash; ${money(order.total)}</p>
       <p><strong>Items requested to cancel:</strong></p>
       <ul>${requestedItemNames.length ? requestedItemNames.map((n) => `<li>${n}</li>`).join('') : '<li>All items</li>'}</ul>
       ${order.cancelReason ? `<p><strong>Reason:</strong> ${order.cancelReason}</p>` : ''}
       <p>Please review it in the admin panel &rarr; Orders &rarr; Cancel Request tab.</p>`
    ),
  });
}

/** Mail to the customer when admin approves their cancellation request. */
export async function sendCancelApprovedMail(order: OrderWithDetails, cancelledItemNames: string[], fullyCancelled: boolean) {
  const to = order.user?.email;
  if (!to) return;
  await sendMailSafe({
    to,
    subject: `[Sajjan Mart] Cancellation approved — Order #${order.orderNumber}`,
    html: wrap(
      'Your cancellation request was accepted',
      `${customerGreeting(order)}
      <p>The following item(s) from your order have been cancelled as requested:</p>
      <ul>${cancelledItemNames.map((n) => `<li>${n}</li>`).join('')}</ul>
      ${order.refundedAmount ? `<p><strong>Refund amount:</strong> ${money(order.refundedAmount)}</p>` : ''}
      ${
        fullyCancelled
          ? `<p>Your entire order #${order.orderNumber} is now cancelled.</p>`
          : `<p>The rest of your order #${order.orderNumber} remains unchanged and will be delivered as planned.</p>`
      }`
    ),
  });
}

/** Mail to the customer when admin rejects their cancellation request. */
export async function sendCancelRejectedMail(order: OrderWithDetails) {
  const to = order.user?.email;
  if (!to) return;
  await sendMailSafe({
    to,
    subject: `[Sajjan Mart] Cancellation request declined — Order #${order.orderNumber}`,
    html: wrap(
      'Your cancellation request was declined',
      `${customerGreeting(order)}
      <p>Your cancellation request for order <strong>#${order.orderNumber}</strong> was reviewed and declined.</p>
      <p>Your order continues as before (status: <strong>${order.status}</strong>) and will be delivered as planned.</p>
      <p>If you have questions, please raise a support ticket from your account page.</p>`
    ),
  });
}

/** Mail to admin with only the raised ticket's details. */
export async function sendTicketCreatedMail(ticket: {
  ticketNumber: string;
  subject: string;
  message: string;
  status: string;
  user?: { email?: string | null; fullName?: string | null; phone?: string | null } | null;
  order?: { orderNumber?: string | null; status?: string | null; total?: any } | null;
}) {
  await sendMailSafe({
    to: ADMIN_EMAIL,
    subject: `[Sajjan Mart] New Ticket ${ticket.ticketNumber}: ${ticket.subject}`,
    html: wrap(
      `New support ticket — ${ticket.ticketNumber}`,
      `<p><strong>Customer:</strong> ${ticket.user?.fullName || '-'} (${ticket.user?.email || '-'})</p>
       ${ticket.order?.orderNumber ? `<p><strong>Related order:</strong> #${ticket.order.orderNumber} (status: ${ticket.order.status}, total: ${money(ticket.order.total)})</p>` : '<p><strong>Related order:</strong> none</p>'}
       <p><strong>Subject:</strong> ${ticket.subject}</p>
       <p><strong>Issue:</strong></p>
       <p style="white-space:pre-wrap;border-left:3px solid #7c3aed;padding-left:12px">${ticket.message}</p>
       <p>Reply from the admin panel &rarr; Tickets.</p>`
    ),
  });
}
