/**
 * Throwaway probe — deleted after the run.
 *
 * Runs the DEPLOYED code path for FCM availability against a given env file.
 * Prints only presence flags and whether messaging is null. Never sends, never
 * reads the database, never prints a key or a token.
 */
import { getFirebaseMessaging } from './lib/firebase-admin';

const presence = (name: string) =>
  `${name}: ${process.env[name] ? 'SET' : 'MISSING'}`;

console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'MISSING');
console.log(presence('FIREBASE_PROJECT_ID'));
console.log(presence('FIREBASE_CLIENT_EMAIL'));
console.log(presence('FIREBASE_PRIVATE_KEY'));

const messaging = getFirebaseMessaging();
console.log('getFirebaseMessaging() ->', messaging === null ? 'NULL (every push is skipped)' : 'READY');
