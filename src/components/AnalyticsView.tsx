import React from 'react';
import { CollectionItem } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';
import { DollarSign, Layers, Heart, Star, MapPin, Award, TrendingUp } from 'lucide-react';

interface AnalyticsViewProps {
  items: CollectionItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ items }) => {
  // Total Valuation
  const totalValue = items.reduce((acc, item) => acc + (item.price || 0), 0);
  const totalCount = items.length;
  const wishlistCount = items.filter((i) => i.wishlist).length;
  const favoritesCount = items.filter((i) => i.favorite).length;

  // Breakdown by Category
  const categoryStats = CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.category === cat.id);
    const catValue = catItems.reduce((acc, i) => acc + (i.price || 0), 0);
    const percentage = totalValue > 0 ? (catValue / totalValue) * 100 : 0;
    return {
      category: cat,
      count: catItems.length,
      value: catValue,
      percentage: Math.round(percentage),
    };
  });

  // Top 5 Most Valuable Items
  const topValuedItems = [...items]
    .filter((i) => i.price !== null)
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-white">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-amber-400" />
          Collection Analytics & Valuation
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          Financial summary and statistical distribution of your recorded personal collection.
        </p>
      </div>

      {/* Top Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Estimated Value */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Est. Total Valuation</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            ${totalValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Across all recorded items</p>
        </div>

        {/* Total Recorded Items */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Collection</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{totalCount} items</p>
          <p className="text-[11px] text-zinc-500 mt-1">In personal vault</p>
        </div>

        {/* Favorites */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Starred Favorites</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{favoritesCount} items</p>
          <p className="text-[11px] text-zinc-500 mt-1">Key prized items</p>
        </div>

        {/* Wishlist */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Wishlist Targets</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-400">{wishlistCount} items</p>
          <p className="text-[11px] text-zinc-500 mt-1">Wanted acquisitions</p>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
          Valuation & Item Breakdown by Category
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {categoryStats.map((st) => (
            <div key={st.category.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-zinc-200">
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-amber-400 ${st.category.bgColor}`}
                  />
                  {st.category.name} ({st.count} items)
                </span>
                <span className="text-amber-400 font-mono">
                  ${st.value.toLocaleString()} ({st.percentage}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(st.percentage, st.count > 0 ? 5 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Valued Items Table */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Top Valued Collection Treasures
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-right">Estimated Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {topValuedItems.map((item) => {
                const cat = CATEGORY_MAP[item.category];
                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={item.frontImage}
                        alt={item.title}
                        className="w-10 h-10 rounded-xl object-cover border border-zinc-800"
                      />
                      <div>
                        <p className="font-bold text-zinc-100">{item.title}</p>
                        <p className="text-[11px] text-zinc-400">
                          {item.artistName || item.makerArtist || item.wineryProducer || ''}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cat.bgColor} ${cat.color}`}>
                        {cat.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">
                      {item.storageLocation || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400 font-mono">
                      ${item.price?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
