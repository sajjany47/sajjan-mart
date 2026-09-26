import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let app: App | null = null;
let messaging: Messaging | null = null;
let initLogged = false;

/**
 * Lazily initialise Firebase Admin from environment variables.
 *
 * Supports two credential formats:
 *   1. FIREBASE_SERVICE_ACCOUNT – a JSON-stringified service-account object
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *
 * Returns null when neither set is present so callers can degrade gracefully.
 */
function getApp(): App | null {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  try {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (jsonStr) {
      const serviceAccount = JSON.parse(jsonStr);
      app = initializeApp({ credential: cert(serviceAccount) });
      console.log('[firebase-admin] Initialized from FIREBASE_SERVICE_ACCOUNT JSON');
      return app;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
      console.log('[firebase-admin] Initialized from FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
      return app;
    }

    // No credentials configured — log once so the operator knows.
    if (!initLogged) {
      initLogged = true;
      console.warn('[firebase-admin] No Firebase credentials found in env. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.');
    }
    return null;
  } catch (err) {
    // Misconfigured credentials — log once, never crash the server.
    if (!initLogged) {
      initLogged = true;
      console.error('[firebase-admin] Initialization failed:', err instanceof Error ? err.message : err);
    }
    return null;
  }
}

/** Returns the Messaging instance, or null if Firebase is not configured. */
export function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;
  const a = getApp();
  if (!a) return null;
  messaging = getMessaging(a);
  return messaging;
}
