import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const VAULTS_DIR = path.join(DATA_DIR, "vaults");

export interface VaultUserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface PublicVaultUser {
  id: string;
  username: string;
  displayName: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(VAULTS_DIR)) fs.mkdirSync(VAULTS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, "[]", "utf8");
}

function readJson<T>(file: string, fallback: T): T {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function publicUser(u: VaultUserRecord): PublicVaultUser {
  return { id: u.id, username: u.username, displayName: u.displayName };
}

function loadUsers(): VaultUserRecord[] {
  return readJson<VaultUserRecord[]>(USERS_FILE, []);
}

function saveUsers(users: VaultUserRecord[]) {
  writeJson(USERS_FILE, users);
}

function loadSessions(): SessionRecord[] {
  const now = Date.now();
  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []).filter((s) => s.expiresAt > now);
  writeJson(SESSIONS_FILE, sessions);
  return sessions;
}

function saveSessions(sessions: SessionRecord[]) {
  writeJson(SESSIONS_FILE, sessions);
}

function vaultPath(userId: string) {
  return path.join(VAULTS_DIR, `${userId}.json`);
}

export function registerUser(usernameRaw: string, password: string, displayName?: string) {
  const username = normalizeUsername(usernameRaw);
  if (username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (username.length > 32) throw new Error("Username must be 32 characters or fewer.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = loadUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error("That username is already taken.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const user: VaultUserRecord = {
    id: crypto.randomUUID(),
    username,
    displayName: (displayName || usernameRaw).trim() || username,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);

  // Empty personal vault
  writeJson(vaultPath(user.id), []);
  return createSession(user);
}

export function loginUser(usernameRaw: string, password: string) {
  const username = normalizeUsername(usernameRaw);
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error("Incorrect username or password.");

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error("Incorrect username or password.");

  return createSession(user);
}

export function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (!currentPassword) throw new Error("Current password is required.");
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }
  if (currentPassword === newPassword) {
    throw new Error("New password must be different from the current password.");
  }

  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("Account not found.");

  const user = users[idx];
  const currentHash = hashPassword(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    throw new Error("Current password is incorrect.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  users[idx] = {
    ...user,
    salt,
    passwordHash: hashPassword(newPassword, salt),
  };
  saveUsers(users);
  return publicUser(users[idx]);
}

function createSession(user: VaultUserRecord) {
  const sessions = loadSessions();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.push({
    token,
    userId: user.id,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 60, // 60 days
  });
  saveSessions(sessions);
  return { token, user: publicUser(user) };
}

export function logoutSession(token: string | null) {
  if (!token) return;
  const sessions = loadSessions().filter((s) => s.token !== token);
  saveSessions(sessions);
}

export function getUserFromToken(token: string | null): PublicVaultUser | null {
  if (!token) return null;
  const session = loadSessions().find((s) => s.token === token);
  if (!session) return null;
  const user = loadUsers().find((u) => u.id === session.userId);
  return user ? publicUser(user) : null;
}

export function readVault(userId: string): unknown[] {
  ensureDirs();
  const file = vaultPath(userId);
  if (!fs.existsSync(file)) return [];
  return readJson<unknown[]>(file, []);
}

export function writeVault(userId: string, items: unknown[]) {
  if (!Array.isArray(items)) throw new Error("Vault items must be an array.");
  writeJson(vaultPath(userId), items);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: "Please sign in." });
  }
  (req as any).vaultUser = user;
  (req as any).vaultToken = token;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  (req as any).vaultUser = getUserFromToken(token);
  (req as any).vaultToken = token;
  next();
}
