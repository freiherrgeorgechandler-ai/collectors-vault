import { CollectionItem } from '../types';
import { apiUrl } from '../utils/apiBase';

export interface VaultUser {
  id: string;
  username: string;
  displayName: string;
  /** Compatibility with older Header UI that expected email/photoURL */
  email?: string | null;
  photoURL?: string | null;
}

const TOKEN_KEY = 'collectors_vault_auth_token';
const USER_KEY = 'collectors_vault_auth_user';

export function getSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getSavedUser(): VaultUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as VaultUser) : null;
  } catch {
    return null;
  }
}

function saveSession(token: string, user: VaultUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders(): HeadersInit {
  const token = getSavedToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function toVaultUser(user: { id: string; username: string; displayName: string }): VaultUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: `@${user.username}`,
    photoURL: null,
  };
}

export async function registerAccount(
  username: string,
  password: string,
  displayName?: string
): Promise<VaultUser> {
  const res = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed.');
  const user = toVaultUser(data.user);
  saveSession(data.token, user);
  return user;
}

export async function loginAccount(username: string, password: string): Promise<VaultUser> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed.');
  const user = toVaultUser(data.user);
  saveSession(data.token, user);
  return user;
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', headers: authHeaders() });
  } finally {
    clearSession();
  }
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(apiUrl('/api/auth/change-password'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to change password.');
}

export async function fetchSessionUser(): Promise<VaultUser | null> {
  const token = getSavedToken();
  if (!token) return null;
  const res = await fetch(apiUrl('/api/auth/me'), { headers: authHeaders() });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  const user = toVaultUser(data.user);
  saveSession(token, user);
  return user;
}

export async function fetchVaultItems(): Promise<CollectionItem[]> {
  const res = await fetch(apiUrl('/api/vault/items'), { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load vault.');
  return Array.isArray(data.items) ? data.items : [];
}

export async function saveVaultItems(items: CollectionItem[]): Promise<void> {
  const res = await fetch(apiUrl('/api/vault/items'), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save vault.');
}
