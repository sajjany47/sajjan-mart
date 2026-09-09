import crypto from 'crypto';
import Razorpay from 'razorpay';
import type { Orders } from 'razorpay/dist/types/orders';
import type { Payments } from 'razorpay/dist/types/payments';
import type { Refunds } from 'razorpay/dist/types/refunds';

type RazorpayOrder = Orders.RazorpayOrder;
type RazorpayPayment = Payments.RazorpayPayment;
type RazorpayRefund = Refunds.RazorpayRefund;

/**
 * Server-only Razorpay wrapper. Never import this from a client component —
 * it pulls in the SDK and secret env vars.
 *
 * Key discipline:
 * - `RAZORPAY_KEY_ID` is safe to expose to the checkout UI (it is the public
 *   key uploaded to the Razorpay Checkout page); `RAZORPAY_KEY_SECRET` and
 *   `RAZORPAY_WEBHOOK_SECRET` must NEVER leave the server.
 */

let instance: Razorpay | null | undefined;

export function razorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID || null;
}

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Lazily build the SDK instance; returns null when secrets are missing. */
export function getRazorpay(): Razorpay | null {
  if (instance !== undefined) return instance;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    instance = null;
    return null;
  }
  instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return instance;
}

export function toPaise(amountRupees: number): number {
  return Math.round(Math.max(0, Number(amountRupees || 0)) * 100);
}

/**
 * Create a Razorpay order for the onward payment.
 * Amount is passed in rupees and converted to paise internally.
 */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
  notes?: Record<string, string>
): Promise<RazorpayOrder> {
  const rzp = getRazorpay();
  if (!rzp) throw new Error('RAZORPAY_KEY_SECRET not configured');
  return rzp.orders.create({
    amount: toPaise(amountRupees),
    currency: 'INR',
    receipt: receipt.slice(0, 40),
    ...(notes ? { notes } : {}),
  });
}

/** Fetch a payment from Razorpay (used to confirm capture before marking paid). */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const rzp = getRazorpay();
  if (!rzp) throw new Error('RAZORPAY_KEY_SECRET not configured');
  return rzp.payments.fetch(paymentId);
}

/**
 * Verify the Checkout signature returned by Razorpay's `handler`.
 * Signature is HMAC SHA256 of `order_id|payment_id` using the key secret.
 */
export function verifyPaymentSignature(payload: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${payload.orderId}|${payload.paymentId}`)
    .digest('hex');
  const received = String(payload.signature || '');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'));
}

/** Create a refund for a paid payment. `amountRupees` → paise. */
export async function createRazorpayRefund(
  paymentId: string,
  amountRupees: number
): Promise<RazorpayRefund> {
  const rzp = getRazorpay();
  if (!rzp) throw new Error('RAZORPAY_KEY_SECRET not configured');
  return rzp.payments.refund(paymentId, { amount: toPaise(amountRupees) });
}

/**
 * Verify a webhook. The SDK helper computes HMAC SHA256 of the raw body with
 * the webhook secret. When the webhook secret is not configured we refuse to
 * trust the event rather than silently accepting anything.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;
  return Razorpay.validateWebhookSignature(rawBody, signature, secret);
}