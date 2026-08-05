import React, { useState } from 'react';
import { CollectionItem } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { resolveMediaUrl } from '../utils/apiBase';
import {
  Star,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  RotateCw,
  Heart,
  Tag,
  DollarSign,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface ItemCardProps {
  item: CollectionItem;
  onSelect: (item: CollectionItem) => void;
  onEdit: (item: CollectionItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  iconLoading?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  iconLoading = false,
}) => {
  const [showBack, setShowBack] = useState(false);
  const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.cd;

  // Format price
  const formattedPrice = item.price !== null && item.price !== undefined
    ? `${item.currency || 'USD'} $${item.price.toLocaleString()}`
    : 'Unpriced';

  // Extract key primary artist/maker/producer subtitle
  const getSubTitle = () => {
    switch (item.category) {
      case 'cd':
      case 'vinyl':
      case 'cassette':
        return item.artistName || 'Unknown Artist';
      case 'dvd':
      case 'bluray':
        return item.directorOrStudio || item.genre || 'Media';
      case 'chinese_tea':
        return item.teaType || item.factoryOrBrand || 'Tea Cake';
      case 'teapot':
        return item.makerArtist || item.clayType || 'Yixing Teapot';
      case 'wine':
        return item.wineryProducer || item.region || 'Vintage Wine';
      case 'painting':
        return item.artistName || item.paintingMedium || 'Artwork';
      default:
        return '';
    }
  };

  // Extract key detail tag
  const getKeyDetailTag = () => {
    if (item.format) return item.format;
    if (item.teaType) return item.teaType;
    if (item.clayType) return item.clayType;
    if (item.wineType) return item.wineType;
    if (item.paintingMedium) return item.paintingMedium;
    return catInfo.name;
  };

  const currentImg = showBack && item.backImage ? item.backImage : item.frontImage;
  const currentImgSrc = resolveMediaUrl(currentImg);
  const showIconLoading = iconLoading && !showBack;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border text-white shadow-lg hover:shadow-2xl transition-all duration-300 ${
        selectionMode && isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-amber-500/10'
          : item.isPendingCategory
          ? 'border-amber-500/80 shadow-amber-500/10 ring-1 ring-amber-500/30'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Selection checkbox (Select Mode) */}
      {selectionMode && (
        <label
          className="absolute top-2.5 left-2.5 z-30 flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-950/90 border border-amber-500/50 shadow cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          title={isSelected ? 'Deselect item' : 'Select item'}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(item.id)}
            className="w-4 h-4 accent-amber-500 cursor-pointer"
          />
        </label>
      )}

      {/* Pending Category Warning Banner if item is unidentifiable */}
      {item.isPendingCategory && (
        <div className={`bg-amber-500 text-zinc-950 px-3 py-1 text-xs font-bold flex items-center justify-between gap-2 shadow z-20 ${selectionMode ? 'pl-12' : ''}`}>
          <span className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
            <span className="truncate">⚠️ Unidentified Category</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="text-[10px] uppercase font-extrabold bg-zinc-950 text-amber-400 px-2 py-0.5 rounded hover:bg-zinc-900 transition-colors shrink-0"
          >
            Assign Category
          </button>
        </div>
      )}

      {/* Photo Container */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950 flex items-center justify-center cursor-pointer"
        onClick={() => {
          if (selectionMode) {
            onToggleSelect?.(item.id);
          }
        }}
      >
        <img
          src={currentImgSrc}
          alt={item.title}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            showIconLoading ? 'opacity-60' : ''
          }`}
          loading="lazy"
        />

        {showIconLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-zinc-950/40 z-[5] pointer-events-none">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="text-[10px] font-medium text-zinc-300 tracking-wide">Finding image…</span>
          </div>
        )}

        {/* Category Badge & Wishlist */}
        <div className={`absolute top-2.5 flex items-center gap-1.5 z-10 ${selectionMode ? 'left-12' : 'left-2.5'}`}>
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor} shadow-md`}
          >
            {catInfo.name}
          </span>
          {item.wishlist && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/90 text-white shadow">
              Wishlist
            </span>
          )}
        </div>

        {/* Top Right Action Overlay (Favorite & Flip Image) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {item.backImage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBack(!showBack);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs text-zinc-200 hover:text-amber-400 hover:bg-black/80 transition-colors shadow"
              title="Flip to Back/Detail Photo"
            >
              <RotateCw className="w-3 h-3" />
              <span className="text-[10px] font-mono">{showBack ? 'Front' : 'Back'}</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-400 hover:text-amber-400 transition-colors shadow"
            title="Toggle Favorite"
          >
            <Star
              className={`w-4 h-4 ${
                item.favorite ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
          </button>
        </div>

        {/* Price Tag Overlay at Bottom Right of Image */}
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <span className="bg-zinc-950/85 backdrop-blur-md border border-zinc-700/80 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-400 shadow-md">
            {formattedPrice}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Subtitle / Artist / Maker */}
        <p className="text-xs font-medium text-amber-400/90 truncate uppercase tracking-wider mb-1">
          {getSubTitle()}
        </p>

        {/* Item Title */}
        <h3
          onClick={() => onSelect(item)}
          className="text-sm sm:text-base font-bold text-zinc-100 line-clamp-1 hover:text-amber-300 cursor-pointer transition-colors"
          title={item.title}
        >
          {item.title}
        </h3>

        {/* Details Grid */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          {/* Format / Type Pill */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50">
            <Tag className="w-3 h-3 text-zinc-400" />
            <span className="truncate max-w-[120px]">{getKeyDetailTag()}</span>
          </span>

          {/* Year */}
          {item.year && (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 font-mono text-[11px]">
              {item.year}
            </span>
          )}

          {/* Location */}
          {item.storageLocation && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 truncate max-w-[140px]">
              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{item.storageLocation}</span>
            </span>
          )}
        </div>

        {/* Footer: Rating, Purchased Source & Action Buttons */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          {/* Rating */}
          <div className="flex items-center gap-0.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelect(item)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
              title="Edit Item"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
              title="Delete Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
