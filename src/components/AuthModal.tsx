import React, { useState } from 'react';
import { X, LogIn, Lock, User as UserIcon, Loader2, CheckCircle2, Shield, AlertCircle, Cloud, Server } from 'lucide-react';
import {
  VaultUser,
  loginAccount,
  registerAccount,
  logoutAccount,
  changeAccountPassword,
} from '../lib/serverAuth';
import {
  getApiBase,
  getDefaultApiBase,
  getSavedApiBase,
  isNativeApp,
  setSavedApiBase,
  testApiConnection,
} from '../utils/apiBase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: VaultUser | null;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onAuthChange: (user: VaultUser | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  syncStatus = 'idle',
  onAuthChange,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(() => getSavedApiBase() || getDefaultApiBase() || getApiBase());
  const [testing, setTesting] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const showServerField = isNativeApp();

  if (!isOpen) return null;

  const persistServerUrl = () => {
    if (!showServerField) return;
    setSavedApiBase(serverUrl);
  };

  const handleTestServer = async () => {
    setTesting(true);
    setError(null);
    setSuccessMsg(null);
    persistServerUrl();
    const result = await testApiConnection(serverUrl);
    if (result.ok) setSuccessMsg(result.detail);
    else setError(result.detail);
    setTesting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    persistServerUrl();
    try {
      const user =
        mode === 'signup'
          ? await registerAccount(username, password, displayName || username)
          : await loginAccount(username, password);
      onAuthChange(user);
      setSuccessMsg(
        mode === 'signup'
          ? `Account created. Welcome, ${user.displayName}! Your collection will sync to this server.`
          : `Welcome back, ${user.displayName}! Loading your collection…`
      );
      setTimeout(() => onClose(), 900);
    } catch (err: any) {
      const raw = String(err?.message || 'Authentication failed.');
      if (/failed to fetch|networkerror|load failed|cannot reach/i.test(raw)) {
        const target = getApiBase() || (typeof window !== 'undefined' ? window.location.origin : 'server');
        setError(
          isNativeApp()
            ? `Cannot reach vault server at ${target}. On this phone open that URL in Chrome first. If Chrome also fails, the phone network is blocking port 3000.`
            : `Cannot reach vault server (${target}). Is the server running?`
        );
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutAccount();
      onAuthChange(null);
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Logged out. Your cloud copy stays on this server — sign in again anytime to recover it.');
      setTimeout(() => onClose(), 700);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setError('Enter your current password and a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setSuccessMsg('Password updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const accountLabel = currentUser?.displayName || currentUser?.username || 'Vault Collector';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e0e11] border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold">Collector Vault Account</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {currentUser ? (
            <div className="space-y-4 text-center py-3">
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-xl text-amber-400">
                  {accountLabel[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-zinc-100">{accountLabel}</h3>
                <p className="text-xs text-zinc-400">@{currentUser.username}</p>
                <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cloud className="w-3 h-3" />
                  {syncStatus === 'syncing'
                    ? 'Syncing…'
                    : syncStatus === 'error'
                      ? 'Sync error'
                      : 'Server vault active'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed px-2">
                Your collection is stored on this server under your username.
                Sign in with the same username and password on another device to open it again.
              </p>

              {!showChangePassword ? (
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(true);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Change Password</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/50 border border-zinc-700 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 rotate-180" />}
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="pt-2 space-y-3 text-left">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">New Password (Min 6 chars)</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Save New Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                    disabled={loading}
                    className="w-full py-2 rounded-xl text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'signin' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'signup' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {showServerField && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Vault Server URL
                    </label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="url"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="http://103.253.14.249:3000"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleTestServer()}
                      disabled={testing || !serverUrl.trim()}
                      className="mt-2 text-[11px] font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-50"
                    >
                      {testing ? 'Testing…' : 'Test connection'}
                    </button>
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Display Name (Optional)
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="e.g. Master Collector"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. tea_collector"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Password (Min 6 chars)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      required
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  {mode === 'signup'
                    ? 'Create a username and password. Your collection is saved on this server so you can recover it on any device.'
                    : 'Sign in with your username and password to load your collection from this server.'}
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  ) : (
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{mode === 'signup' ? 'Create Account & Sync Vault' : 'Sign In to Server Vault'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
