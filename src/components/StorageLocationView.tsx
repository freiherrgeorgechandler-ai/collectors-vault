import React, { useState } from 'react';
import { CollectionItem } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { MapPin, Box, Search, Plus } from 'lucide-react';

interface StorageLocationViewProps {
  items: CollectionItem[];
  onSelect: (item: CollectionItem) => void;
  onAddNew: () => void;
}

export const StorageLocationView: React.FC<StorageLocationViewProps> = ({
  items,
  onSelect,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Group items by storage location name
  const groupedLocations = React.useMemo(() => {
    const map: Record<string, CollectionItem[]> = {};
    items.forEach((item) => {
      const loc = item.storageLocation?.trim() || 'Unassigned / Needs Location';
      if (!map[loc]) map[loc] = [];
      map[loc].push(item);
    });
    return map;
  }, [items]);

  const locationKeys = Object.keys(groupedLocations).filter((loc) =>
    loc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-white">
      {/* Title & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-amber-400" />
            Storage Location Index
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Browse and organize items physically grouped by cabinets, shelves, racks, and vaults.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Location Group Cards */}
      {locationKeys.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-400">
          <Box className="w-12 h-12 mx-auto mb-2 text-zinc-600" />
          <p className="text-sm font-semibold">No storage locations match search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {locationKeys.map((loc) => {
            const locItems = groupedLocations[loc];
            const locTotalValue = locItems.reduce((acc, i) => acc + (i.price || 0), 0);

            return (
              <div
                key={loc}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4"
              >
                {/* Location Header */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">{loc}</h3>
                      <p className="text-xs text-zinc-400">
                        {locItems.length} items recorded • Subtotal: ${locTotalValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Horizontal Scroll Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {locItems.map((item) => {
                    const cat = CATEGORY_MAP[item.category];
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className="group relative bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden p-2 hover:border-amber-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-black mb-2">
                          <img
                            src={item.frontImage}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${cat.bgColor} ${cat.color} block w-fit mb-1`}>
                          {cat.name}
                        </span>
                        <p className="text-xs font-bold text-zinc-200 line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {item.artistName || item.makerArtist || item.wineryProducer || ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
