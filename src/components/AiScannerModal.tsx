import React, { useState } from 'react';
import { CollectionItem, CategoryType } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';
import { checkDuplicateItem, checkCategoryMismatch } from '../utils/validation';
import { CameraModal } from './CameraModal';
import { apiUrl } from '../utils/apiBase';
import { useOnlineStatus, checkIsOnline, AI_OFFLINE_MESSAGE } from '../hooks/useOnlineStatus';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  WifiOff,
} from 'lucide-react';

interface AiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNewItem: (item: Partial<CollectionItem>) => void;
  existingItems?: CollectionItem[];
}

export const AiScannerModal: React.FC<AiScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveNewItem,
  existingItems = [],
}) => {
  const isOnline = useOnlineStatus();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [category, setCategory] = useState<CategoryType>('cd');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhoto(event.target.result as string);
          setExtractedData(null);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const SEARCH_STEPS = [
    "🌐 Searching global online collector databases & catalog archives...",
    "🔍 Matching item against master records & vintage registers...",
    "📊 Sorting artist, producer, country & valuation history...",
    "✨ Structuring curator attributes & appraisal notes..."
  ];

  const duplicateItem = extractedData
    ? checkDuplicateItem(
        {
          title: extractedData.title,
          artistName: extractedData.artistOrDirector,
          wineryProducer: extractedData.artistOrDirector,
          factoryOrBrand: extractedData.artistOrDirector,
          makerArtist: extractedData.artistOrDirector,
        },
        existingItems
      )
    : null;

  const categoryMismatch = extractedData
    ? checkCategoryMismatch(
        {
          title: extractedData.title,
          format: extractedData.format,
          notes: extractedData.tastingOrNotes,
          category,
        },
        extractedData.detectedCategory
      )
    : null;

  const handleRunAiScan = async () => {
    if (!photo && !prompt) {
      setErrorMsg('Please upload a photo or type a title/prompt first.');
      return;
    }
    if (!(await checkIsOnline())) {
      setErrorMsg(AI_OFFLINE_MESSAGE);
      return;
    }

    setLoading(true);
    setSearchStep(0);
    setErrorMsg(null);

    // Interval to cycle through search steps showing busy progress
    const stepInterval = setInterval(() => {
      setSearchStep((prev) => (prev + 1) % SEARCH_STEPS.length);
    }, 1200);

    try {
      const res = await fetch(apiUrl('/api/gemini/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category,
          title: prompt,
          image: photo,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setExtractedData(json.data);
      } else {
        setErrorMsg(json.error || 'AI scanner failed to parse item.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('AI API request failed.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!extractedData) return;
    const d = extractedData;
    const newItem: Partial<CollectionItem> = {
      category: category,
      title: d.title || 'Untitled Collection Item',
      artistName: d.artistOrDirector,
      makerArtist: d.artistOrDirector,
      wineryProducer: d.artistOrDirector,
      directorOrStudio: d.artistOrDirector,
      factoryOrBrand: d.artistOrDirector,
      genre: d.genreOrSubtype,
      teaType: d.genreOrSubtype,
      clayType: d.genreOrSubtype,
      wineType: d.genreOrSubtype,
      paintingMedium: d.genreOrSubtype,
      year: d.year,
      country: d.countryOrOrigin,
      price: d.estimatedPrice || null,
      currency: 'USD',
      storageLocation: 'Main Display Shelf',
      format: d.format || CATEGORY_MAP[category].defaultFormat,
      condition: d.condition || 'Near Mint',
      rating: 5,
      frontImage:
        photo ||
        'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=800&auto=format&fit=crop&q=80',
      tastingNotes: d.tastingOrNotes,
      notes: d.tastingOrNotes ? `AI Scan Note: ${d.tastingOrNotes}` : 'Scanned with AI',
      favorite: false,
      wishlist: false,
    };

    onSaveNewItem(newItem);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl my-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Gemini AI Photo Scanner
                </h2>
                <p className="text-xs text-zinc-400">
                  Snap or upload an item photo to auto-detect title, maker & details
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                Select Item Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      category === cat.id
                        ? `${cat.bgColor} ${cat.color} ${cat.borderColor} font-bold ring-2 ring-purple-400/30`
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture Preview Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase">
                Item Photo (Front, Wrapper, Seal, or Label)
              </label>
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center group">
                {photo ? (
                  <img src={photo} alt="Scan item" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-6 text-zinc-500">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 text-purple-400/50" />
                    <p className="text-xs">Take or upload a photo to identify with AI</p>
                  </div>
                )}

                {/* Overlay Action buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 shadow"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                  <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 cursor-pointer shadow">
                    <Upload className="w-4 h-4" />
                    Upload File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Additional Text Context */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                Optional Title / Hint
              </label>
              <input
                type="text"
                placeholder="e.g. 1998 Dayi 7542 Puer / Abbey Road Beatles / Bordeaux 2010"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Searching & Sorting Online Status Box */}
            {loading && (
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between text-purple-300 font-bold">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>AI Online Research Engine Busy</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 font-mono text-purple-200">
                    Live Search
                  </span>
                </div>
                <p className="text-zinc-200 font-medium animate-pulse transition-all">
                  {SEARCH_STEPS[searchStep]}
                </p>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 via-indigo-400 to-amber-400 h-1.5 transition-all duration-300 rounded-full"
                    style={{ width: `${((searchStep + 1) / SEARCH_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Run Scan Button */}
            <button
              onClick={() => void handleRunAiScan()}
              disabled={loading || !isOnline}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 text-white text-sm font-bold hover:from-purple-500 hover:to-amber-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              title={isOnline ? undefined : AI_OFFLINE_MESSAGE}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-purple-200" />
                  <span>Searching Online Catalog & Sorting...</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-5 h-5 text-purple-200" />
                  <span>Connect to Internet for AI Scan</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-purple-200" />
                  <span>Analyze & Extract Item Details</span>
                </>
              )}
            </button>

            {/* Extracted Details Preview */}
            {extractedData && (
              <div className="p-5 rounded-2xl bg-zinc-950 border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    AI Detected Item Record
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">Gemini 3.6 Flash</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Title</span>
                    <strong className="text-white">{extractedData.title || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Artist / Maker / Winery</span>
                    <strong className="text-amber-300">{extractedData.artistOrDirector || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Type / Genre</span>
                    <strong className="text-zinc-200">{extractedData.genreOrSubtype || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Year / Country</span>
                    <strong className="text-zinc-200">{extractedData.year || 'N/A'} ({extractedData.countryOrOrigin || 'N/A'})</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">Est. Market Value</span>
                    <strong className="text-amber-400 font-mono">${extractedData.estimatedPrice || 'N/A'}</strong>
                  </div>
                  {extractedData.tastingOrNotes && (
                    <div className="col-span-2 pt-1 border-t border-zinc-800/60">
                      <span className="text-zinc-500 block font-semibold">Tasting / Notes</span>
                      <p className="text-zinc-300 leading-relaxed">{extractedData.tastingOrNotes}</p>
                    </div>
                  )}
                </div>

                {/* Duplicate Item Warning */}
                {duplicateItem && (
                  <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Item Already in Collection!</span>
                    </div>
                    <p className="text-zinc-200">
                      You already have <strong className="text-amber-300">"{duplicateItem.title}"</strong> recorded in your <strong className="text-amber-300">{CATEGORIES.find(c => c.id === duplicateItem.category)?.name || duplicateItem.category}</strong> vault.
                    </p>
                  </div>
                )}

                {/* Category Mismatch Warning */}
                {categoryMismatch && (
                  <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Category Mismatch Detected!</span>
                    </div>
                    <p className="text-zinc-200">
                      This item matches format terms ("<strong className="text-rose-300">{categoryMismatch.matchedKeyword}</strong>"), but you currently have category <strong className="text-amber-300">{CATEGORIES.find(c => c.id === category)?.name}</strong> selected.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCategory(categoryMismatch.suggestedCategory)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all flex items-center gap-2"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Switch Category to {categoryMismatch.suggestedLabel}</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={handleConfirmAdd}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save to Vault</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => {
          setPhoto(img);
          setExtractedData(null);
        }}
        title="Snap Item for AI Scan"
      />
    </>
  );
};
