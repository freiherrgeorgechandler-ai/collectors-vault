import React, { useState, useEffect } from 'react';
import { CollectionItem, CategoryType, ItemCondition } from '../types';
import { checkDuplicateItem, checkCategoryMismatch } from '../utils/validation';
import {
  CATEGORIES,
  CURRENCIES,
  PRESET_CONDITIONS,
  MEDIA_GENRES,
  TEA_TYPES,
  CLAY_TYPES,
  WINE_TYPES,
  PAINTING_MEDIUMS,
} from '../data/categories';
import { CameraModal } from './CameraModal';
import { apiUrl } from '../utils/apiBase';
import { useOnlineStatus, checkIsOnline, AI_OFFLINE_MESSAGE } from '../hooks/useOnlineStatus';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  RotateCw,
  Plus,
  Save,
  DollarSign,
  MapPin,
  Tag,
  Star,
  Check,
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  WifiOff,
} from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<CollectionItem>) => void;
  initialItem?: CollectionItem | null;
  defaultCategory?: CategoryType;
  existingItems?: CollectionItem[];
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultCategory = 'cd',
  existingItems = [],
}) => {
  const [formData, setFormData] = useState<Partial<CollectionItem>>({
    category: defaultCategory,
    title: '',
    price: null,
    currency: 'USD',
    storageLocation: '',
    year: new Date().getFullYear(),
    country: '',
    purchasedDate: '',
    purchasedSource: '',
    frontImage: '',
    backImage: '',
    artistName: '',
    genre: '',
    genreContent: '',
    format: '',
    directorOrStudio: '',
    teaType: '',
    teaOrigin: '',
    weightGrams: undefined,
    factoryOrBrand: '',
    storageCondition: 'Dry Storage',
    tastingNotes: '',
    optimalSteeping: '',
    clayType: '',
    makerArtist: '',
    capacityMl: undefined,
    craftStyle: 'Full Handmade',
    dedicatedTeaType: '',
    hasCertificate: false,
    wineType: '',
    wineryProducer: '',
    region: '',
    grapeVariety: '',
    abvPercent: undefined,
    drinkingWindow: '',
    paintingMedium: '',
    dimensions: '',
    framingStatus: 'Framed',
    signatureLocation: '',
    provenance: '',
    condition: 'Near Mint',
    rating: 5,
    favorite: false,
    wishlist: false,
    notes: '',
  });

  const [activeCameraTarget, setActiveCameraTarget] = useState<'front' | 'back' | null>(null);
  const isOnline = useOnlineStatus();
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSearchStep, setAiSearchStep] = useState(0);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiDetectedCategory, setAiDetectedCategory] = useState<string | null>(null);

  const duplicateItem = checkDuplicateItem(formData, existingItems, initialItem?.id);
  const categoryMismatch = checkCategoryMismatch(formData, aiDetectedCategory || undefined);

  const AI_SEARCH_STEPS = [
    "🌐 Querying global online collector databases & auction archives...",
    "🔍 Matching title & image against master catalog records...",
    "📊 Sorting artist, vintage, edition & estimated market value...",
    "✨ Auto-populating item details into form fields..."
  ];

  useEffect(() => {
    if (initialItem) {
      setFormData(initialItem);
    } else {
      setFormData({
        category: defaultCategory,
        title: '',
        price: null,
        currency: 'USD',
        storageLocation: '',
        year: '',
        country: '',
        purchasedDate: '',
        purchasedSource: '',
        frontImage:
          'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=800&auto=format&fit=crop&q=80',
        backImage: '',
        condition: 'Near Mint',
        rating: 5,
        favorite: false,
        wishlist: false,
      });
    }
    setAiMessage(null);
  }, [initialItem, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CollectionItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          handleChange(target === 'front' ? 'frontImage' : 'backImage', dataUrl);
          if (target === 'front' && !initialItem) {
            void handleAiAnalyze(dataUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Smart Fill call
  const handleAiAnalyze = async (imageOverride?: string) => {
    const image = imageOverride ?? formData.frontImage;
    if (!(await checkIsOnline())) {
      setAiMessage(AI_OFFLINE_MESSAGE);
      return;
    }
    setAiAnalyzing(true);
    setAiSearchStep(0);
    setAiMessage(null);

    const stepInterval = setInterval(() => {
      setAiSearchStep((prev) => (prev + 1) % AI_SEARCH_STEPS.length);
    }, 1200);

    try {
      const res = await fetch(apiUrl('/api/gemini/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          image,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.detectedCategory) {
          setAiDetectedCategory(d.detectedCategory);
        }
        setFormData((prev) => ({
          ...prev,
          ...(imageOverride ? { frontImage: imageOverride } : {}),
          title: d.title || prev.title,
          artistName: d.artistOrDirector || prev.artistName,
          makerArtist: d.artistOrDirector || prev.makerArtist,
          wineryProducer: d.artistOrDirector || prev.wineryProducer,
          directorOrStudio: d.artistOrDirector || prev.directorOrStudio,
          factoryOrBrand: d.artistOrDirector || prev.factoryOrBrand,
          genre: d.genreOrSubtype || prev.genre,
          teaType: d.genreOrSubtype || prev.teaType,
          clayType: d.genreOrSubtype || prev.clayType,
          wineType: d.genreOrSubtype || prev.wineType,
          paintingMedium: d.genreOrSubtype || prev.paintingMedium,
          year: d.year || prev.year,
          country: d.countryOrOrigin || prev.country,
          price: d.estimatedPrice !== undefined ? d.estimatedPrice : prev.price,
          format: d.format || prev.format,
          condition: (d.condition as ItemCondition) || prev.condition,
          tastingNotes: d.tastingOrNotes || prev.tastingNotes,
          notes: prev.notes ? `${prev.notes}\nAI Extraction: ${d.tastingOrNotes || ''}` : d.tastingOrNotes,
        }));
        setAiMessage('✨ AI details auto-filled successfully from online lookup!');
      } else {
        setAiMessage(json.error || 'AI analysis unavailable. Please fill manually.');
      }
    } catch (err: any) {
      console.error(err);
      setAiMessage('AI analysis failed. Please check connection.');
    } finally {
      clearInterval(stepInterval);
      setAiAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Please enter a title for this item.');
      return;
    }
    onSave({
      ...formData,
      isPendingCategory: false, // Category has been manually reviewed and saved
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl my-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{initialItem ? 'Edit Record' : 'Record New Item'}</span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleAiAnalyze()}
                disabled={aiAnalyzing || !isOnline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-semibold hover:bg-purple-600/50 transition-all active:scale-95 disabled:opacity-50"
                title={
                  isOnline
                    ? 'Use Gemini AI to extract details from image or title'
                    : AI_OFFLINE_MESSAGE
                }
              >
                {aiAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                ) : !isOnline ? (
                  <WifiOff className="w-4 h-4 text-purple-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-400" />
                )}
                <span>{isOnline ? 'AI Smart Fill' : 'AI Offline'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Online Search Busy Banner */}
          {aiAnalyzing && (
            <div className="bg-purple-950/80 border-b border-purple-600/50 px-6 py-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-purple-200">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                  <span>Searching Online Collector Repositories & Archives...</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI BUSY
                </span>
              </div>
              <p className="text-zinc-200 animate-pulse">{AI_SEARCH_STEPS[aiSearchStep]}</p>
              <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 via-indigo-400 to-amber-400 h-1 transition-all duration-300 rounded-full"
                  style={{ width: `${((aiSearchStep + 1) / AI_SEARCH_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* AI Banner Message */}
          {aiMessage && (
            <div className="bg-purple-950/60 border-b border-purple-800/80 px-6 py-2 text-xs text-purple-200 flex items-center justify-between">
              <span>{aiMessage}</span>
              <button onClick={() => setAiMessage(null)} className="text-purple-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* PENDING CATEGORY NOTICE BANNER */}
          {formData.isPendingCategory && (
            <div className="bg-amber-950/90 border-b border-amber-500/70 px-6 py-3 text-xs space-y-1 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-amber-300">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Pending List Item — Manual Categorization Required</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  PENDING REVIEW
                </span>
              </div>
              <p className="text-zinc-200">
                {formData.pendingReason || 'This item was imported from a receipt and requires category confirmation.'} Select the appropriate category below and click <strong className="text-amber-300">Save Changes</strong> to categorize it.
              </p>
            </div>
          )}

          {/* 1. DUPLICATE ITEM WARNING BANNER */}
          {duplicateItem && (
            <div className="bg-amber-950/80 border-b border-amber-500/60 px-6 py-3 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-amber-300">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Item Already Recorded in Vault Collection!</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  DUPLICATE DETECTED
                </span>
              </div>
              <p className="text-zinc-200">
                An item titled <strong className="text-amber-300">"{duplicateItem.title}"</strong> ({duplicateItem.artistName || duplicateItem.wineryProducer || duplicateItem.factoryOrBrand || 'Vault'}) is already recorded in your <strong className="text-amber-300">{CATEGORIES.find(c => c.id === duplicateItem.category)?.name || duplicateItem.category}</strong> collection.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                <span>Format: {duplicateItem.format || 'Standard'}</span>
                <span>•</span>
                <span>Valuation: ${duplicateItem.price || 0}</span>
                <span>•</span>
                <span>Location: {duplicateItem.storageLocation || 'Main Vault'}</span>
              </div>
            </div>
          )}

          {/* 2. CATEGORY / FORMAT MISMATCH WARNING BANNER */}
          {categoryMismatch && (
            <div className="bg-rose-950/80 border-b border-rose-500/60 px-6 py-3 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-rose-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Category Mismatch Identified!</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  FORMAT CONFLICT
                </span>
              </div>
              <p className="text-zinc-200">
                This item contains format terms ("<strong className="text-rose-300">{categoryMismatch.matchedKeyword}</strong>"), but your selected category is <strong className="text-amber-300">{CATEGORIES.find(c => c.id === formData.category)?.name}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleChange('category', categoryMismatch.suggestedCategory);
                  setAiDetectedCategory(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-rose-500/20"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Switch Category to {categoryMismatch.suggestedLabel}</span>
              </button>
            </div>
          )}

          {/* Form Scroll Body */}
          <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
            {/* Category Selector Buttons */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                Select Category *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleChange('category', cat.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center ${
                      formData.category === cat.id
                        ? `${cat.bgColor} ${cat.color} ${cat.borderColor} font-bold ring-2 ring-amber-400/30 shadow-md`
                        : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs font-semibold">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photos — camera/upload from AI Photo-Scan, always visible */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                Item Photo (Front, Wrapper, Seal, or Label)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Front Photo */}
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 flex items-center justify-between">
                    <span>Front Cover / Main View *</span>
                    {formData.frontImage && <span className="text-emerald-400 text-[10px]">Loaded</span>}
                  </span>
                  <div className="relative aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center">
                    {formData.frontImage ? (
                      <img
                        src={formData.frontImage}
                        alt="Front view"
                        className="w-full h-full object-contain sm:object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-zinc-500">
                        <Sparkles className="w-8 h-8 mx-auto mb-1 text-amber-400/50" />
                        <p className="text-xs">Take or upload a photo to identify with AI</p>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCameraTarget('front')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 shadow"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Take Photo
                      </button>
                      <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 cursor-pointer shadow">
                        <Upload className="w-3.5 h-3.5" />
                        Upload File
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload(e, 'front')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  {!initialItem && formData.frontImage && (
                    <button
                      type="button"
                      onClick={() => void handleAiAnalyze()}
                      disabled={aiAnalyzing || !isOnline}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 text-white text-xs font-bold hover:from-purple-500 hover:to-amber-500 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {aiAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing photo…</span>
                        </>
                      ) : !isOnline ? (
                        <>
                          <WifiOff className="w-4 h-4" />
                          <span>Connect to use AI photo analysis</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze Photo & Auto-Fill Details</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Back Photo */}
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 flex items-center justify-between">
                    <span>Back Cover / Detail / Seal Photo</span>
                    {formData.backImage && <span className="text-emerald-400 text-[10px]">Loaded</span>}
                  </span>
                  <div className="relative aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center">
                    {formData.backImage ? (
                      <img
                        src={formData.backImage}
                        alt="Back view"
                        className="w-full h-full object-contain sm:object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-zinc-500">
                        <Upload className="w-8 h-8 mx-auto mb-1 text-zinc-600" />
                        <p className="text-xs">Optional back/detail photo</p>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCameraTarget('back')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 shadow"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Take Photo
                      </button>
                      <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 cursor-pointer shadow">
                        <Upload className="w-3.5 h-3.5" />
                        Upload File
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload(e, 'back')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core General Information Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Title / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kind of Blue / 1998 Menghai 7542 Puer / Château Margaux 2010"
                  value={formData.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Price & Currency */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Price / Estimated Value
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currency || 'USD'}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 150"
                    value={formData.price !== null && formData.price !== undefined ? formData.price : ''}
                    onChange={(e) => handleChange('price', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Storage Location */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Storage Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shelf A-1, Cellar Rack 3, Cabinet B"
                  value={formData.storageLocation || ''}
                  onChange={(e) => handleChange('storageLocation', e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Year / Vintage */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Year / Vintage
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1959, 1998, 2010"
                  value={formData.year || ''}
                  onChange={(e) => handleChange('year', e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Country / Origin */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Country / Origin
                </label>
                <input
                  type="text"
                  placeholder="e.g. USA, UK, Japan, China (Yunnan), France"
                  value={formData.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Purchased Month Year & Source */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Purchased Month / Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2022-08"
                  value={formData.purchasedDate || ''}
                  onChange={(e) => handleChange('purchasedDate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Purchased Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tower Records Tokyo / Sotheby's / Estate Sale"
                  value={formData.purchasedSource || ''}
                  onChange={(e) => handleChange('purchasedSource', e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* CATEGORY SPECIFIC FIELDS */}
            <div className="border-t border-zinc-800 pt-5 space-y-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Category Tailored Attributes ({formData.category?.toUpperCase()})
              </h3>

              {/* Media Categories (CD, Vinyl, Cassette, DVD, Blu-ray) */}
              {(formData.category === 'cd' ||
                formData.category === 'vinyl' ||
                formData.category === 'cassette' ||
                formData.category === 'dvd' ||
                formData.category === 'bluray') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Artist Name / Director / Studio
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Miles Davis / Christopher Nolan / Daft Punk"
                      value={formData.artistName || formData.directorOrStudio || ''}
                      onChange={(e) => {
                        handleChange('artistName', e.target.value);
                        handleChange('directorOrStudio', e.target.value);
                      }}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Genre
                    </label>
                    <input
                      type="text"
                      list="media-genres"
                      placeholder="e.g. Jazz, Classical, Rock, Sci-Fi"
                      value={formData.genre || ''}
                      onChange={(e) => handleChange('genre', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="media-genres">
                      {MEDIA_GENRES.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Format Specifics
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CD, Hybrid SACD, 12' LP 33RPM, Chrome Cassette, 4K UHD"
                      value={formData.format || ''}
                      onChange={(e) => handleChange('format', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Genre Content / Tracklist / Special Contents
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Side A: Track 1, Track 2. Side B: Track 3. Includes liner notes booklet."
                      value={formData.genreContent || ''}
                      onChange={(e) => handleChange('genreContent', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Chinese Tea */}
              {formData.category === 'chinese_tea' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Tea Variety / Category
                    </label>
                    <input
                      type="text"
                      list="tea-types"
                      placeholder="e.g. Puer Raw (Sheng), Oolong, Wuyi Rock Tea"
                      value={formData.teaType || ''}
                      onChange={(e) => handleChange('teaType', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="tea-types">
                      {TEA_TYPES.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Tea Origin / Mountain Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Yunnan Menghai, Fujian Wuyi Mountains"
                      value={formData.teaOrigin || ''}
                      onChange={(e) => handleChange('teaOrigin', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Weight (Grams)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 357"
                      value={formData.weightGrams || ''}
                      onChange={(e) => handleChange('weightGrams', parseFloat(e.target.value) || undefined)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Factory / Brand / Batch
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Menghai Tea Factory (Dayi 7542)"
                      value={formData.factoryOrBrand || ''}
                      onChange={(e) => handleChange('factoryOrBrand', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Optimal Steeping Temperature & Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100°C boiling mineral water, 10s flash steep"
                      value={formData.optimalSteeping || ''}
                      onChange={(e) => handleChange('optimalSteeping', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Storage Condition
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hong Kong Clean Dry Storage"
                      value={formData.storageCondition || ''}
                      onChange={(e) => handleChange('storageCondition', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Tasting Notes & Liquor Profile
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Rich camphor aroma, sweet ginseng finish, thick honey oil liquor."
                      value={formData.tastingNotes || ''}
                      onChange={(e) => handleChange('tastingNotes', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Teapot */}
              {formData.category === 'teapot' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Clay Type (Zisha Clay)
                    </label>
                    <input
                      type="text"
                      list="clay-types"
                      placeholder="e.g. Zhuni, Zini, Duanni, Dahongpao"
                      value={formData.clayType || ''}
                      onChange={(e) => handleChange('clayType', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="clay-types">
                      {CLAY_TYPES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Maker Artist / Master Seal
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Master Su Feng (Senior Craftsman Seal)"
                      value={formData.makerArtist || ''}
                      onChange={(e) => handleChange('makerArtist', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Capacity (ml)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 160"
                      value={formData.capacityMl || ''}
                      onChange={(e) => handleChange('capacityMl', parseFloat(e.target.value) || undefined)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Craftsmanship Style
                    </label>
                    <select
                      value={formData.craftStyle || 'Full Handmade'}
                      onChange={(e) => handleChange('craftStyle', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="100% Full Handmade">100% Full Handmade</option>
                      <option value="Semi Handmade">Semi Handmade</option>
                      <option value="Molded Clay">Molded Clay</option>
                      <option value="Antique Vintage">Antique Vintage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Dedicated Seasoned Tea Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dedicated to Aged Raw Puer only"
                      value={formData.dedicatedTeaType || ''}
                      onChange={(e) => handleChange('dedicatedTeaType', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="hasCert"
                      checked={!!formData.hasCertificate}
                      onChange={(e) => handleChange('hasCertificate', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="hasCert" className="text-xs text-zinc-300 font-medium cursor-pointer">
                      Includes Original Artist Box & Certificate
                    </label>
                  </div>
                </div>
              )}

              {/* Wine */}
              {formData.category === 'wine' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Château / Winery Producer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Château Margaux / Penfolds"
                      value={formData.wineryProducer || ''}
                      onChange={(e) => handleChange('wineryProducer', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Wine Variety
                    </label>
                    <input
                      type="text"
                      list="wine-types"
                      placeholder="e.g. Red Wine, White Wine, Champagne"
                      value={formData.wineType || ''}
                      onChange={(e) => handleChange('wineType', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="wine-types">
                      {WINE_TYPES.map((w) => (
                        <option key={w} value={w} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Appellation / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Margaux, Bordeaux, France"
                      value={formData.region || ''}
                      onChange={(e) => handleChange('region', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Grape Variety
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cabernet Sauvignon, Merlot"
                      value={formData.grapeVariety || ''}
                      onChange={(e) => handleChange('grapeVariety', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Alcohol % (ABV)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 13.5"
                      value={formData.abvPercent || ''}
                      onChange={(e) => handleChange('abvPercent', parseFloat(e.target.value) || undefined)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Optimal Drinking Window
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2025 - 2050"
                      value={formData.drinkingWindow || ''}
                      onChange={(e) => handleChange('drinkingWindow', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Sommelier Tasting Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Blackberry, violet, graphite notes. Silky tannins."
                      value={formData.tastingNotes || ''}
                      onChange={(e) => handleChange('tastingNotes', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Painting */}
              {formData.category === 'painting' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Artist Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lin Hai"
                      value={formData.artistName || ''}
                      onChange={(e) => handleChange('artistName', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Artistic Medium
                    </label>
                    <input
                      type="text"
                      list="painting-mediums"
                      placeholder="e.g. Oil on Canvas, Ink on Xuan Paper"
                      value={formData.paintingMedium || ''}
                      onChange={(e) => handleChange('paintingMedium', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="painting-mediums">
                      {PAINTING_MEDIUMS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Dimensions (Width x Height)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 90 x 120 cm (35 x 47 in)"
                      value={formData.dimensions || ''}
                      onChange={(e) => handleChange('dimensions', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Framing Status
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Framed with UV Museum Glass"
                      value={formData.framingStatus || ''}
                      onChange={(e) => handleChange('framingStatus', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Signature Location & Provenance
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Bottom left signed with artist red vermilion seal."
                      value={formData.provenance || ''}
                      onChange={(e) => handleChange('provenance', e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Condition, Rating & Wishlist Toggle */}
            <div className="border-t border-zinc-800 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Condition Rating
                </label>
                <select
                  value={formData.condition || 'Near Mint'}
                  onChange={(e) => handleChange('condition', e.target.value as ItemCondition)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {PRESET_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Curator Rating (1-5)
                </label>
                <div className="flex items-center gap-1.5 pt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleChange('rating', star)}
                      className="p-1 rounded-lg hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= (formData.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium">
                  <input
                    type="checkbox"
                    checked={!!formData.wishlist}
                    onChange={(e) => handleChange('wishlist', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-rose-500 focus:ring-rose-500"
                  />
                  <span>Mark as Wishlist / Wanted Item</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium">
                  <input
                    type="checkbox"
                    checked={!!formData.favorite}
                    onChange={(e) => handleChange('favorite', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Mark as Favorite</span>
                </label>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                Additional Notes & Historical Context
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Purchased at Kyoto antique store, exceptional preservation, verified authentic."
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Submit Bar */}
            <div className="border-t border-zinc-800 pt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition-all text-xs shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{initialItem ? 'Save Changes' : 'Add to Collection'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={!!activeCameraTarget}
        onClose={() => setActiveCameraTarget(null)}
        onCapture={(img) => {
          if (activeCameraTarget === 'front') {
            handleChange('frontImage', img);
            if (!initialItem) {
              void handleAiAnalyze(img);
            }
          }
          if (activeCameraTarget === 'back') handleChange('backImage', img);
        }}
        title={`Take ${activeCameraTarget === 'front' ? 'Front Cover' : 'Back/Detail'} Photo`}
      />
    </>
  );
};
