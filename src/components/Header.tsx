import React from 'react';
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  BarChart3,
  Heart,
  SlidersHorizontal,
  Download,
  RotateCcw,
  ShieldCheck,
  User as UserIcon,
  LogIn,
  Receipt,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { ViewMode, FilterState } from '../types';
import { VaultUser } from '../lib/serverAuth';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onAddNew: () => void;
  onOpenReceiptScanner: () => void;
  onOpenExportImport: () => void;
  onResetData: () => void;
  onOpenAuth: () => void;
  currentUser: VaultUser | null;
  totalCount: number;
  totalValue: string;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  filters,
  setFilters,
  onAddNew,
  onOpenReceiptScanner,
  onOpenExportImport,
  onResetData,
  onOpenAuth,
  currentUser,
  totalCount,
  totalValue,
  pendingCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-zinc-800 text-white shadow-xl">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-extrabold shadow-md shadow-amber-500/20 text-lg">
            M
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
              MyCollection
              <span className="text-zinc-500 font-normal text-sm">/ My Vault</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                PRO
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              {totalCount} items recorded • Vault Valuation: <span className="font-bold text-amber-500">{totalValue}</span>
              {pendingCount > 0 && (
                <span className="ml-2 font-bold text-amber-400 flex-inline items-center gap-1">
                  • ⚠️ {pendingCount} Pending Category
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Bulk Add Item Button */}
          <button
            onClick={onOpenReceiptScanner}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-semibold hover:bg-amber-500/30 transition-all shadow-md active:scale-95"
            title="Bulk add multiple items from a receipt — unrecognized items go to Pending List"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bulk Add Item</span>
          </button>

          {/* Add Item — includes camera upload + AI photo analyze */}
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs sm:text-sm font-semibold hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 active:scale-95"
            title="Add item with camera photo and AI auto-fill"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            <span>Add Item</span>
          </button>

          {/* Export / Backup — labeled so it is easy to find */}
          <button
            onClick={onOpenExportImport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-semibold border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Export PDF / Excel / CSV / JSON backup"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onResetData}
            className="hidden md:flex p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Reset to Demo Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* User Account / Auth Login Button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              currentUser
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
            }`}
            title={currentUser ? `Logged in as ${currentUser.username}` : 'Sign In / Account'}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
            ) : currentUser ? (
              <div className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-[10px] font-extrabold">
                {(currentUser.displayName || currentUser.username || 'U')[0].toUpperCase()}
              </div>
            ) : (
              <UserIcon className="w-4 h-4 text-zinc-400" />
            )}
            <span className="hidden sm:inline max-w-[120px] truncate">
              {currentUser ? currentUser.displayName || currentUser.username : 'Sign In'}
            </span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar: Search & View Modes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 bg-[#09090b]/80 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search collection, artist, winery, notes..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-9 pr-10 py-1.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-full text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          {filters.searchQuery ? (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 font-medium"
            >
              Clear
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600 pointer-events-none hidden sm:block">
              ⌘K
            </div>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Grid</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Compact List View"
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">List</span>
          </button>

          <button
            onClick={() => setViewMode('location')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'location'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Group by Storage Location"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Storage Map</span>
          </button>

          <button
            onClick={() => setViewMode('wishlist')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'wishlist'
                ? 'bg-rose-500 text-white font-semibold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Wishlist / Wanted"
          >
            <Heart className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Wishlist</span>
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Analytics & Valuation"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Analytics</span>
          </button>
        </div>
      </div>
    </header>
  );
};
