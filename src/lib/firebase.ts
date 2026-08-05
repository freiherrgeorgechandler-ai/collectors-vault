import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(
  app, 
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const yahooProvider = new OAuthProvider('yahoo.com');

/** Synthetic email domain so Firebase Auth can store username+password accounts. */
export const USERNAME_EMAIL_DOMAIN = 'vault.collectors.app';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export function usernameToEmail(username: string): string {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3) {
    throw new Error('Username must be at least 3 characters (letters, numbers, . _ -).');
  }
  if (normalized.length > 32) {
    throw new Error('Username must be 32 characters or fewer.');
  }
  return `${normalized}@${USERNAME_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  const suffix = `@${USERNAME_EMAIL_DOMAIN}`;
  if (email.toLowerCase().endsWith(suffix)) {
    return email.slice(0, -suffix.length);
  }
  return null;
}

export async function registerWithUsername(username: string, password: string, displayName?: string) {
  const email = usernameToEmail(username);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const label = (displayName || username).trim();
  if (label) {
    await updateProfile(credential.user, { displayName: label });
  }
  return credential.user;
}

export async function loginWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Helper to sign in or register with email & password (kept for Google/email flows)
export async function loginOrRegisterWithEmail(email: string, pass: string, name?: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    if (name && credential.user && !credential.user.displayName) {
      await updateProfile(credential.user, { displayName: name });
    }
    return credential.user;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
      const newCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && newCredential.user) {
        await updateProfile(newCredential.user, { displayName: name });
      }
      return newCredential.user;
    }
    throw err;
  }
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function loginWithYahoo() {
  const result = await signInWithPopup(auth, yahooProvider);
  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export { onAuthStateChanged, type User };
