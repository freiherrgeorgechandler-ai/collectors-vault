import React from 'react';
import { CATEGORIES } from '../data/categories';
import { CategoryType, FilterState, CollectionItem } from '../types';
import {
  Disc,
  Palette,
  Disc3,
  Film,
  Tv,
  Radio as CassetteIcon,
  Leaf,
  Wine,
  Coffee,
  Layers,
  Star,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';

interface CategoryNavProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  items: CollectionItem[];
}

const getCategoryIcon = (iconName: string, className = 'w-4 h-4') => {
  switch (iconName) {
    case 'Disc':
      return <Disc className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Disc3':
      return <Disc3 className={className} />;
    case 'Film':
      return <Film className={className} />;
    case 'Tv':
      return <Tv className={className} />;
    case 'Cassette':
      return <CassetteIcon className={className} />;
    case 'Leaf':
      return <Leaf className={className} />;
    case 'Wine':
      return <Wine className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    default:
      return <Layers className={className} />;
  }
};

export const CategoryNav: React.FC<CategoryNavProps> = ({
  filters,
  setFilters,
  items,
}) => {
  // Count items per category
  const counts = React.useMemo(() => {
    const acc: Record<string, number> = { all: items.length, pending: 0 };
    items.forEach((item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      if (item.isPendingCategory) {
        acc.pending = (acc.pending || 0) + 1;
      }
    });
    return acc;
  }, [items]);

  const pendingCount = counts.pending || 0;

  return (
    <div className="bg-[#0c0c0e] border-b border-zinc-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Horizontal Category Pill List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 no-scrollbar text-xs">
          {/* All Option */}
          <button
            onClick={() => setFilters((prev) => ({ ...prev, category: 'all', pendingOnly: false }))}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition-all ${
              filters.category === 'all' && !filters.pendingOnly
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Categories</span>
            <span
              className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                filters.category === 'all' && !filters.pendingOnly
                  ? 'bg-zinc-950/30 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {counts.all || 0}
            </span>
          </button>

          {/* Pending List Filter Pill */}
          {pendingCount > 0 && (
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  pendingOnly: !prev.pendingOnly,
                  category: 'all',
                }))
              }
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold transition-all ${
                filters.pendingOnly
                  ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 animate-pulse'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending List</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/30 text-amber-200">
                {pendingCount}
              </span>
            </button>
          )}

          {/* 9 Specified Categories */}
          {CATEGORIES.map((cat) => {
            const isSelected = filters.category === cat.id && !filters.pendingOnly;
            const count = counts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    category: cat.id as CategoryType,
                    pendingOnly: false,
                  }))
                }
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition-all ${
                  isSelected
                    ? `${cat.bgColor} ${cat.color} font-semibold ring-1 ${cat.borderColor} shadow-sm`
                    : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                }`}
              >
                {getCategoryIcon(cat.iconName, 'w-3.5 h-3.5')}
                <span>{cat.name}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-zinc-900/40 text-current font-bold' : 'bg-zinc-700/60 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters & Sorting controls */}
        <div className="flex items-center gap-2 self-end sm:self-center text-xs">
          {/* Favorites Only toggle */}
          <button
            onClick={() => setFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
              filters.favoritesOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filters.favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-2.5 py-1.5 text-zinc-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as FilterState['sortBy'],
                }))
              }
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="dateAdded" className="bg-zinc-900">Date Added (Newest)</option>
              <option value="title" className="bg-zinc-900">Title (A-Z)</option>
              <option value="priceDesc" className="bg-zinc-900">Price (High to Low)</option>
              <option value="priceAsc" className="bg-zinc-900">Price (Low to High)</option>
              <option value="year" className="bg-zinc-900">Year / Vintage</option>
              <option value="rating" className="bg-zinc-900">Rating (Highest)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
