import React, { useState } from 'react';
import { CollectionItem } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import {
  X,
  Star,
  MapPin,
  Calendar,
  Globe,
  Tag,
  DollarSign,
  Edit2,
  Trash2,
  Share2,
  Printer,
  ShieldCheck,
  RotateCw,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ItemDetailModalProps {
  item: CollectionItem | null;
  onClose: () => void;
  onEdit: (item: CollectionItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  if (!item) return null;

  const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.cd;
  const [activePhoto, setActivePhoto] = useState<'front' | 'back' | number>('front');

  // Collect all available photos
  const photos: { label: string; url: string; key: 'front' | 'back' | number }[] = [];
  if (item.frontImage) photos.push({ label: 'Front Photo', url: item.frontImage, key: 'front' });
  if (item.backImage) photos.push({ label: 'Back / Detail Photo', url: item.backImage, key: 'back' });
  if (item.extraImages) {
    item.extraImages.forEach((img, idx) => {
      photos.push({ label: `Extra Photo ${idx + 1}`, url: img, key: idx });
    });
  }

  const currentPhotoUrl =
    activePhoto === 'front'
      ? item.frontImage
      : activePhoto === 'back'
      ? item.backImage || item.frontImage
      : item.extraImages?.[activePhoto as number] || item.frontImage;

  const formattedPrice =
    item.price !== null && item.price !== undefined
      ? `${item.currency || 'USD'} $${item.price.toLocaleString()}`
      : 'Unpriced / Personal Value';

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`}
            >
              {catInfo.name}
            </span>
            <span className="text-xs text-zinc-400 font-mono">ID: {item.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
              title="Toggle Favorite"
            >
              <Star
                className={`w-5 h-5 ${
                  item.favorite ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
            <button
              onClick={handlePrintCertificate}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Print Item Certificate"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {/* PENDING CATEGORY BANNER */}
          {item.isPendingCategory && (
            <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/70 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-300">Unidentified Category (Pending List)</h4>
                  <p className="text-zinc-300 mt-0.5">
                    {item.pendingReason || 'This item was uploaded from a receipt and requires manual category assignment.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onEdit(item);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shrink-0 transition-all shadow"
              >
                Assign Category Now
              </button>
            </div>
          )}

          {/* Photos & Title Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Gallery Column */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 group">
                <img
                  src={currentPhotoUrl}
                  alt={item.title}
                  className="h-full w-full object-contain bg-zinc-950"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-mono text-zinc-300">
                  {photos.find((p) => p.key === activePhoto)?.label || 'Photo'}
                </div>
              </div>

              {/* Thumbnail Selector */}
              {photos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {photos.map((p) => (
                    <button
                      key={String(p.key)}
                      onClick={() => setActivePhoto(p.key)}
                      className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activePhoto === p.key
                          ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                          : 'border-zinc-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Core Overview Column */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div>
                {/* Artist / Producer subtitle */}
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">
                  {item.artistName ||
                    item.makerArtist ||
                    item.wineryProducer ||
                    item.directorOrStudio ||
                    item.factoryOrBrand ||
                    catInfo.name}
                </p>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {item.title}
                </h2>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-2 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-zinc-400 ml-2">({item.rating}/5 rating)</span>
                </div>
              </div>

              {/* Highlight Price & Storage Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80">
                  <p className="text-[11px] text-zinc-400 uppercase font-medium flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    Est. Value / Cost
                  </p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{formattedPrice}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80">
                  <p className="text-[11px] text-zinc-400 uppercase font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Storage Location
                  </p>
                  <p className="text-sm font-semibold text-zinc-200 mt-1 truncate">
                    {item.storageLocation || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* General Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700">
                  Condition: <strong className="text-amber-300">{item.condition}</strong>
                </span>
                {item.year && (
                  <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
                    Year/Vintage: {item.year}
                  </span>
                )}
                {item.country && (
                  <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700">
                    Origin: {item.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category-Tailored Metadata Sections */}
          <div className="border-t border-zinc-800 pt-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Category Specific Specifications
            </h3>

            {/* Media (CD, Vinyl, Cassette, DVD, Blu-ray) */}
            {(item.category === 'cd' ||
              item.category === 'vinyl' ||
              item.category === 'cassette' ||
              item.category === 'dvd' ||
              item.category === 'bluray') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
                {item.artistName && (
                  <div>
                    <span className="text-zinc-500 block">Artist / Performer</span>
                    <span className="font-semibold text-zinc-200">{item.artistName}</span>
                  </div>
                )}
                {item.directorOrStudio && (
                  <div>
                    <span className="text-zinc-500 block">Director / Studio</span>
                    <span className="font-semibold text-zinc-200">{item.directorOrStudio}</span>
                  </div>
                )}
                {item.genre && (
                  <div>
                    <span className="text-zinc-500 block">Genre</span>
                    <span className="font-semibold text-zinc-200">{item.genre}</span>
                  </div>
                )}
                {item.format && (
                  <div>
                    <span className="text-zinc-500 block">Format</span>
                    <span className="font-semibold text-amber-300">{item.format}</span>
                  </div>
                )}
                {item.purchasedDate && (
                  <div>
                    <span className="text-zinc-500 block">Purchased Month/Year/Source</span>
                    <span className="font-semibold text-zinc-200">
                      {item.purchasedDate} {item.purchasedSource ? `• ${item.purchasedSource}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Genre Content / Tracklist for CD, Vinyl, DVD */}
            {item.genreContent && (
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-xs">
                <span className="text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                  Genre Content / Tracklist / Synopsis
                </span>
                <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {item.genreContent}
                </p>
              </div>
            )}

            {/* Chinese Tea Specs */}
            {item.category === 'chinese_tea' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
                {item.teaType && (
                  <div>
                    <span className="text-zinc-500 block">Tea Category / Variety</span>
                    <span className="font-semibold text-teal-300">{item.teaType}</span>
                  </div>
                )}
                {item.teaOrigin && (
                  <div>
                    <span className="text-zinc-500 block">Origin Region</span>
                    <span className="font-semibold text-zinc-200">{item.teaOrigin}</span>
                  </div>
                )}
                {item.weightGrams && (
                  <div>
                    <span className="text-zinc-500 block">Net Weight</span>
                    <span className="font-semibold text-zinc-200 font-mono">{item.weightGrams} grams</span>
                  </div>
                )}
                {item.factoryOrBrand && (
                  <div>
                    <span className="text-zinc-500 block">Factory / Tea Master</span>
                    <span className="font-semibold text-zinc-200">{item.factoryOrBrand}</span>
                  </div>
                )}
                {item.storageCondition && (
                  <div>
                    <span className="text-zinc-500 block">Storage Environment</span>
                    <span className="font-semibold text-zinc-200">{item.storageCondition}</span>
                  </div>
                )}
                {item.optimalSteeping && (
                  <div className="sm:col-span-2 mt-1">
                    <span className="text-zinc-500 block">Optimal Steeping Guide</span>
                    <span className="font-semibold text-amber-300">{item.optimalSteeping}</span>
                  </div>
                )}
                {item.tastingNotes && (
                  <div className="sm:col-span-2 mt-1 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500 block font-semibold mb-1">Tasting & Liquor Profile</span>
                    <p className="text-zinc-300 leading-relaxed">{item.tastingNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Teapot Specs */}
            {item.category === 'teapot' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
                {item.clayType && (
                  <div>
                    <span className="text-zinc-500 block">Zisha Clay Material</span>
                    <span className="font-semibold text-orange-300">{item.clayType}</span>
                  </div>
                )}
                {item.makerArtist && (
                  <div>
                    <span className="text-zinc-500 block">Master Craftsman / Artist Seal</span>
                    <span className="font-semibold text-zinc-200">{item.makerArtist}</span>
                  </div>
                )}
                {item.capacityMl && (
                  <div>
                    <span className="text-zinc-500 block">Water Capacity</span>
                    <span className="font-semibold text-zinc-200 font-mono">{item.capacityMl} ml</span>
                  </div>
                )}
                {item.craftStyle && (
                  <div>
                    <span className="text-zinc-500 block">Craftsmanship Style</span>
                    <span className="font-semibold text-zinc-200">{item.craftStyle}</span>
                  </div>
                )}
                {item.dedicatedTeaType && (
                  <div className="sm:col-span-2">
                    <span className="text-zinc-500 block">Dedicated Tea Seasoning</span>
                    <span className="font-semibold text-teal-300">{item.dedicatedTeaType}</span>
                  </div>
                )}
                {item.hasCertificate && (
                  <div className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Includes Original Artist Box & Certificate</span>
                  </div>
                )}
              </div>
            )}

            {/* Wine Specs */}
            {item.category === 'wine' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
                {item.wineryProducer && (
                  <div>
                    <span className="text-zinc-500 block">Château / Winery</span>
                    <span className="font-semibold text-purple-300">{item.wineryProducer}</span>
                  </div>
                )}
                {item.wineType && (
                  <div>
                    <span className="text-zinc-500 block">Wine Variety</span>
                    <span className="font-semibold text-zinc-200">{item.wineType}</span>
                  </div>
                )}
                {item.region && (
                  <div>
                    <span className="text-zinc-500 block">Appellation / Region</span>
                    <span className="font-semibold text-zinc-200">{item.region}</span>
                  </div>
                )}
                {item.grapeVariety && (
                  <div>
                    <span className="text-zinc-500 block">Grape Varieties</span>
                    <span className="font-semibold text-zinc-200">{item.grapeVariety}</span>
                  </div>
                )}
                {item.abvPercent && (
                  <div>
                    <span className="text-zinc-500 block">Alcohol (ABV)</span>
                    <span className="font-semibold text-zinc-200 font-mono">{item.abvPercent}%</span>
                  </div>
                )}
                {item.drinkingWindow && (
                  <div>
                    <span className="text-zinc-500 block">Optimal Drinking Window</span>
                    <span className="font-semibold text-amber-300 font-mono">{item.drinkingWindow}</span>
                  </div>
                )}
                {item.tastingNotes && (
                  <div className="sm:col-span-2 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500 block font-semibold mb-1">Sommelier Tasting Notes</span>
                    <p className="text-zinc-300 leading-relaxed">{item.tastingNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Painting Specs */}
            {item.category === 'painting' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
                {item.artistName && (
                  <div>
                    <span className="text-zinc-500 block">Artist Name</span>
                    <span className="font-semibold text-rose-300">{item.artistName}</span>
                  </div>
                )}
                {item.paintingMedium && (
                  <div>
                    <span className="text-zinc-500 block">Artistic Medium</span>
                    <span className="font-semibold text-zinc-200">{item.paintingMedium}</span>
                  </div>
                )}
                {item.dimensions && (
                  <div>
                    <span className="text-zinc-500 block">Dimensions</span>
                    <span className="font-semibold text-zinc-200 font-mono">{item.dimensions}</span>
                  </div>
                )}
                {item.framingStatus && (
                  <div>
                    <span className="text-zinc-500 block">Framing Status</span>
                    <span className="font-semibold text-zinc-200">{item.framingStatus}</span>
                  </div>
                )}
                {item.signatureLocation && (
                  <div className="sm:col-span-2">
                    <span className="text-zinc-500 block">Signature & Seal</span>
                    <span className="font-semibold text-zinc-200">{item.signatureLocation}</span>
                  </div>
                )}
                {item.provenance && (
                  <div className="sm:col-span-2 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500 block font-semibold mb-1">Provenance & History</span>
                    <p className="text-zinc-300 leading-relaxed">{item.provenance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes & Curator Memo */}
            {item.notes && (
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-xs">
                <span className="text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                  Curator Notes & Acquisition Source
                </span>
                <p className="text-zinc-300 leading-relaxed">{item.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4 bg-zinc-950/90">
          <button
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            Delete Record
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-medium"
            >
              Close
            </button>
            <button
              onClick={() => {
                onEdit(item);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 transition-all text-xs shadow-md shadow-amber-500/20"
            >
              <Edit2 className="w-4 h-4" />
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
