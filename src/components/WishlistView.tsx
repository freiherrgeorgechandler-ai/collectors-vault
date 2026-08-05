import React from 'react';
import { CollectionItem } from '../types';
import { ItemCard } from './ItemCard';
import { Heart, Plus, Sparkles } from 'lucide-react';

interface WishlistViewProps {
  items: CollectionItem[];
  onSelect: (item: CollectionItem) => void;
  onEdit: (item: CollectionItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onAddNewWishlist: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  items,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onAddNewWishlist,
}) => {
  const wishlistItems = items.filter((i) => i.wishlist);
  const totalWishlistCost = wishlistItems.reduce((acc, i) => acc + (i.price || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-white">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            Wishlist & Wanted Acquisitions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            {wishlistItems.length} wanted items • Est. Target Cost: ${totalWishlistCost.toLocaleString()}
          </p>
        </div>

        <button
          onClick={onAddNewWishlist}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Wishlist Target</span>
        </button>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/60 rounded-3xl border border-zinc-800 p-8">
          <Heart className="w-12 h-12 mx-auto mb-3 text-rose-500/40" />
          <h3 className="text-base font-bold text-zinc-200">Your Wishlist is Empty</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-4">
            Track rare vinyl records, aged tea cakes, vintage wines, or master teapots you plan to acquire.
          </p>
          <button
            onClick={onAddNewWishlist}
            className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors shadow-md"
          >
            Add Wishlist Target
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlistItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};
