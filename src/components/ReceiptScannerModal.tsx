import React, { useMemo, useState } from 'react';
import { CollectionItem, CategoryType, ReceiptItem, ReceiptScanResult } from '../types';
import { CATEGORIES, CATEGORY_MAP, CURRENCIES } from '../data/categories';
import { checkDuplicateItem } from '../utils/validation';
import { CameraModal } from './CameraModal';
import { apiUrl } from '../utils/apiBase';
import { useOnlineStatus, checkIsOnline, AI_OFFLINE_MESSAGE } from '../hooks/useOnlineStatus';
import {
  X,
  Receipt,
  Upload,
  Camera,
  RefreshCw,
  FileText,
  Sparkles,
  Check,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Tag,
  DollarSign,
  Calendar,
  Building2,
  AlertCircle,
  Filter,
  Copy,
  WifiOff,
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatchItems: (items: Partial<CollectionItem>[]) => void;
  existingItems?: CollectionItem[];
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveBatchItems,
  existingItems = [],
}) => {
  const isOnline = useOnlineStatus();
  const [inputMode, setInputMode] = useState<'photo' | 'text'>('photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed result state
  const [receiptResult, setReceiptResult] = useState<ReceiptScanResult | null>(null);
  const [extractedItems, setExtractedItems] = useState<ReceiptItem[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'categorized'>('all');

  // Map receipt line id → matching vault item (if already in collection)
  const duplicateMap = useMemo(() => {
    const map: Record<string, CollectionItem> = {};
    for (const item of extractedItems) {
      const match = checkDuplicateItem(
        {
          title: item.title,
          artistName: item.artistOrMaker || '',
          makerArtist: item.artistOrMaker || '',
          wineryProducer: item.artistOrMaker || '',
          factoryOrBrand: item.artistOrMaker || '',
        },
        existingItems
      );
      if (match) {
        map[item.id] = match;
      }
    }
    return map;
  }, [extractedItems, existingItems]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhoto(event.target.result as string);
          setReceiptResult(null);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const SCAN_STEPS = [
    "🧾 Scanning receipt layout & OCR text recognition...",
    "💵 Extracting item line titles and purchase prices...",
    "🧠 Auto-matching items against vault collection categories...",
    "⚠️ Flagging unidentifiable items for pending manual review..."
  ];

  const handleRunReceiptScan = async () => {
    if (!photo && !pastedText.trim()) {
      setErrorMsg('Please upload a receipt photo or paste receipt text first.');
      return;
    }
    if (!(await checkIsOnline())) {
      setErrorMsg(AI_OFFLINE_MESSAGE);
      return;
    }

    setLoading(true);
    setSearchStep(0);
    setErrorMsg(null);

    const stepInterval = setInterval(() => {
      setSearchStep((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 1200);

    try {
      const res = await fetch(apiUrl('/api/gemini/analyze-receipt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: photo,
          text: pastedText,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data as ReceiptScanResult;
        setReceiptResult(data);
        setVendorName(data.vendorName || 'Receipt Store');
        setPurchaseDate(data.purchaseDate || new Date().toISOString().split('T')[0]);

        // Process items with unique client IDs
        const normalizeCategory = (raw: string | undefined): CategoryType | 'unidentified' => {
          const c = (raw || '').toLowerCase().trim();
          if (['vinyl', 'painting', 'cd', 'dvd', 'bluray', 'cassette', 'chinese_tea', 'wine', 'teapot'].includes(c)) {
            return c as CategoryType;
          }
          if (c === 'tea' || c === 'puer' || c === 'oolong') return 'chinese_tea';
          if (c === 'lp' || c === 'record') return 'vinyl';
          if (c === 'blu-ray' || c === '4k' || c === 'uhd') return 'bluray';
          if (c === 'art' || c === 'artwork') return 'painting';
          if (c === 'yixing' || c === 'zisha') return 'teapot';
          return 'unidentified';
        };

        const itemsWithIds: ReceiptItem[] = (data.items || []).map((item, idx) => {
          const category = normalizeCategory(item.category as string);
          const isPending =
            item.isPending ||
            category === 'unidentified' ||
            item.confidence === 'low';
          return {
            ...item,
            id: `receipt-item-${Date.now()}-${idx}`,
            category,
            isPending,
          };
        });

        if (itemsWithIds.length === 0) {
          setErrorMsg(
            'No product line items were found on this receipt. Try a clearer photo, or paste the full receipt text.'
          );
          setExtractedItems([]);
        } else {
          setExtractedItems(itemsWithIds);
          if (itemsWithIds.some((i) => i.isPending)) {
            setActiveTab('all');
          }
        }
      } else {
        setErrorMsg(json.error || 'Failed to parse receipt.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Network error while processing receipt.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  // Inline category changer for items
  const handleItemCategoryChange = (id: string, newCat: CategoryType | 'unidentified') => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isNowCategorized = newCat !== 'unidentified';
          return {
            ...item,
            category: newCat,
            isPending: !isNowCategorized,
            confidence: isNowCategorized ? 'high' : 'low',
            reason: isNowCategorized ? 'Manually selected by user' : item.reason,
          };
        }
        return item;
      })
    );
  };

  // Inline item field edits
  const handleItemFieldEdit = (id: string, field: keyof ReceiptItem, val: any) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id) ? { ...item, [field]: val } : item)
    );
  };

  // Delete item from batch
  const handleDeleteItem = (id: string) => {
    setExtractedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add new manual item row
  const handleAddManualRow = () => {
    const newRow: ReceiptItem = {
      id: `manual-item-${Date.now()}`,
      title: 'New Purchased Item',
      price: 0,
      currency: receiptResult?.currency || 'USD',
      category: 'unidentified',
      isPending: true,
      confidence: 'low',
      reason: 'Manually added line item',
    };
    setExtractedItems((prev) => [newRow, ...prev]);
  };

  // Confirm and save to Vault — warn on duplicates, but allow intentional re-purchases
  const handleConfirmSaveAll = () => {
    if (extractedItems.length === 0) return;

    const duplicateRows = extractedItems.filter((item) => !!duplicateMap[item.id]);
    if (duplicateRows.length > 0) {
      const list = duplicateRows
        .map((item) => {
          const match = duplicateMap[item.id]!;
          return `• "${item.title}"  (already have: "${match.title}")`;
        })
        .join('\n');

      const proceed = window.confirm(
        `⚠ Duplicate warning\n\n` +
          `${duplicateRows.length} item(s) from this receipt look like something already in your collection:\n\n` +
          `${list}\n\n` +
          `This is fine if you bought the same item again.\n\n` +
          `OK = Continue and add all items (including duplicates)\n` +
          `Cancel = Go back and review the list`
      );

      if (!proceed) return;
    }

    const itemsToSave: Partial<CollectionItem>[] = extractedItems.map((item) => {
      const isUnidentified = item.category === 'unidentified';
      const needsPending = isUnidentified || item.isPending || item.confidence === 'low';
      const cat: CategoryType = isUnidentified ? 'cd' : (item.category as CategoryType);
      const vaultDuplicate = duplicateMap[item.id];

      return {
        title: item.title || 'Receipt Purchased Item',
        category: cat,
        price: item.price !== null && item.price !== undefined ? Number(item.price) : null,
        currency: item.currency || receiptResult?.currency || 'USD',
        purchasedSource: vendorName || 'Receipt Purchase',
        purchasedDate: purchaseDate || new Date().toISOString().split('T')[0],
        storageLocation: 'Main Display Shelf',
        artistName: item.artistOrMaker || '',
        makerArtist: item.artistOrMaker || '',
        wineryProducer: item.artistOrMaker || '',
        factoryOrBrand: item.artistOrMaker || '',
        condition: 'Near Mint',
        rating: 5,
        favorite: false,
        wishlist: false,
        isPendingCategory: needsPending,
        pendingReason: needsPending
          ? isUnidentified
            ? `Could not identify category from receipt (${vendorName || 'store'}). Please assign the correct category.`
            : item.reason ||
              `Low-confidence match from receipt (${vendorName || 'store'}). Please confirm category.`
          : undefined,
        notes: [
          `Bulk added via receipt (${vendorName || 'store'}, ${purchaseDate}).`,
          item.reason || '',
          vaultDuplicate
            ? `Note: Possible re-purchase — similar item already in vault ("${vaultDuplicate.title}").`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim(),
        // Placeholder only — App resolves a per-item logo/favicon asynchronously after save.
        // (Do not reuse the receipt photo for every line item.)
      };
    });

    onSaveBatchItems(itemsToSave);
    onClose();
  };

  // Calculations for pending items
  const pendingCount = extractedItems.filter((i) => i.isPending || i.category === 'unidentified').length;
  const categorizedCount = extractedItems.filter((i) => !i.isPending && i.category !== 'unidentified').length;
  const duplicateCount = Object.keys(duplicateMap).length;

  const filteredItems = extractedItems.filter((i) => {
    if (activeTab === 'pending') return i.isPending || i.category === 'unidentified';
    if (activeTab === 'categorized') return !i.isPending && i.category !== 'unidentified';
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl my-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Bulk Add Item</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    RECEIPT → ALL ITEMS
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Upload a receipt with multiple CDs, vinyls, etc. Recognized items are categorized; unrecognized ones go to the Pending List.
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
            {/* Input Selection Header */}
            {!receiptResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs w-fit">
                  <button
                    onClick={() => setInputMode('photo')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                      inputMode === 'photo'
                        ? 'bg-amber-500 text-zinc-950 shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Receipt Image / Photo</span>
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                      inputMode === 'text'
                        ? 'bg-amber-500 text-zinc-950 shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Invoice / Receipt Text</span>
                  </button>
                </div>

                {/* Photo Upload Box */}
                {inputMode === 'photo' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">
                      Receipt Document or Photo
                    </label>
                    <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center group">
                      {photo ? (
                        <img src={photo} alt="Receipt" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center p-6 text-zinc-500">
                          <Receipt className="w-10 h-10 mx-auto mb-2 text-amber-500/50" />
                          <p className="text-xs text-zinc-300 font-medium">
                            Upload a store receipt, paper invoice or e-receipt screenshot
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Supported: PNG, JPG, WEBP, Camera Snap
                          </p>
                        </div>
                      )}

                      {/* Action buttons overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setIsCameraOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 shadow"
                        >
                          <Camera className="w-4 h-4" />
                          Snap Photo
                        </button>
                        <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 cursor-pointer shadow">
                          <Upload className="w-4 h-4" />
                          Choose Image
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
                )}

                {/* Text Invoice Paste Box */}
                {inputMode === 'text' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                      Paste Receipt Text / Digital Invoice
                    </label>
                    <textarea
                      rows={5}
                      placeholder={`e.g.
Tower Records Tokyo - 2024-05-10
1. Miles Davis - Kind of Blue LP Vinyl: $35.00
2. Chateau Margaux 2010 Wine: $120.00
3. Universal Storage Box: $12.50
4. Aged Raw Puer Tea Cake 357g: $85.00`}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                    />
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Scanning Progress */}
                {loading && (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-amber-300 font-bold">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Receipt Gemini OCR Engine Active</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        Parsing Receipt
                      </span>
                    </div>
                    <p className="text-zinc-200 font-medium animate-pulse transition-all">
                      {SCAN_STEPS[searchStep]}
                    </p>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-500 h-1.5 transition-all duration-300 rounded-full"
                        style={{ width: `${((searchStep + 1) / SCAN_STEPS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={() => void handleRunReceiptScan()}
                  disabled={loading || !isOnline}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 text-white text-sm font-bold hover:from-amber-400 hover:to-indigo-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  title={isOnline ? undefined : AI_OFFLINE_MESSAGE}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Parsing Receipt & Categorizing Items...</span>
                    </>
                  ) : !isOnline ? (
                    <>
                      <WifiOff className="w-5 h-5 text-amber-200" />
                      <span>Connect to Internet for AI Receipt Scan</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-200" />
                      <span>Process Receipt — Extract ALL Items</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* EXTRACTED RESULTS REVIEW DASHBOARD */}
            {receiptResult && (
              <div className="space-y-5">
                {/* Primary: Scan New Receipt — large & easy to reach */}
                <button
                  type="button"
                  onClick={() => {
                    setReceiptResult(null);
                    setExtractedItems([]);
                    setErrorMsg(null);
                    setPhoto(null);
                    setPastedText('');
                    setActiveTab('all');
                  }}
                  className="w-full py-4 sm:py-5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-extrabold text-sm sm:text-base hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-3 active:scale-[0.99] border border-amber-300/40"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-950/15">
                    <Camera className="w-5 h-5" />
                  </span>
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span>Scan New Receipt</span>
                    <span className="text-[11px] font-semibold text-zinc-900/70">
                      Clear results and upload another receipt
                    </span>
                  </span>
                  <RefreshCw className="w-5 h-5 ml-auto opacity-80" />
                </button>

                {/* Vendor Summary Card */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-mono text-[10px]">Vendor / Source</span>
                      <input
                        type="text"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                        placeholder="Store Name"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-mono text-[10px]">Purchase Date</span>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-mono text-[10px]">Total Extracted</span>
                      <strong className="text-emerald-400 text-sm font-mono">
                        {receiptResult.currency || 'USD'} ${(receiptResult.totalAmount || extractedItems.reduce((acc, i) => acc + (i.price || 0), 0)).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & Pending Count Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === 'all'
                          ? 'bg-amber-500 text-zinc-950 shadow'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      All Line Items ({extractedItems.length})
                    </button>

                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                          : 'bg-zinc-900 text-amber-400 hover:bg-amber-500/10'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pending Review ({pendingCount})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('categorized')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === 'categorized'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Auto-Categorized ({categorizedCount})</span>
                    </button>
                  </div>

                  <button
                    onClick={handleAddManualRow}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                {/* PENDING ITEMS SPECIAL ALERT BANNER */}
                {pendingCount > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 space-y-1.5 text-xs text-amber-200 shadow-md animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{pendingCount} Item(s) in Pending List Need Manual Categorization</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">
                      These items could not be auto-matched with 100% confidence to a collection category. Select the correct category for each item below using the dropdown picker before saving.
                    </p>
                  </div>
                )}

                {/* DUPLICATE ITEMS ALERT BANNER */}
                {duplicateCount > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/50 space-y-1.5 text-xs text-rose-100 shadow-md animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-rose-300">
                      <Copy className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        {duplicateCount} Item(s) Already Exist in Your Collection
                      </span>
                      <span className="ml-auto text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/40">
                        Duplicate Alert
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">
                      Matching titles were found in your vault (possible re-purchase). Those rows are marked below.
                      You can still add them — you will get a confirmation warning before saving.
                    </p>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-3">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-950 rounded-2xl border border-zinc-800">
                      No items found under this tab filter.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isPending = item.isPending || item.category === 'unidentified';
                      const catInfo = item.category !== 'unidentified' ? CATEGORY_MAP[item.category] : null;
                      const vaultDuplicate = duplicateMap[item.id];

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all duration-300 ${
                            vaultDuplicate
                              ? 'bg-rose-950/35 border-rose-500/60 shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/20'
                              : isPending
                              ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
                              : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Title & Artist inputs */}
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => handleItemFieldEdit(item.id, 'title', e.target.value)}
                                  className="min-w-0 flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                                  placeholder="Item Title"
                                />

                                {vaultDuplicate ? (
                                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    <Copy className="w-3 h-3 text-rose-400" />
                                    <span>Already in Vault</span>
                                  </span>
                                ) : isPending ? (
                                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    <span>Needs Category</span>
                                  </span>
                                ) : (
                                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Categorized</span>
                                  </span>
                                )}
                              </div>

                              {vaultDuplicate && (
                                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                                  Matches existing vault item:{' '}
                                  <strong className="text-rose-100">"{vaultDuplicate.title}"</strong>
                                  {(vaultDuplicate.artistName ||
                                    vaultDuplicate.makerArtist ||
                                    vaultDuplicate.wineryProducer ||
                                    vaultDuplicate.factoryOrBrand) && (
                                    <>
                                      {' '}
                                      by{' '}
                                      <strong className="text-rose-100">
                                        {vaultDuplicate.artistName ||
                                          vaultDuplicate.makerArtist ||
                                          vaultDuplicate.wineryProducer ||
                                          vaultDuplicate.factoryOrBrand}
                                      </strong>
                                    </>
                                  )}{' '}
                                  ({CATEGORIES.find((c) => c.id === vaultDuplicate.category)?.name ||
                                    vaultDuplicate.category}
                                  )
                                </p>
                              )}

                              <div className="flex items-center gap-2 text-xs">
                                <input
                                  type="text"
                                  value={item.artistOrMaker || ''}
                                  onChange={(e) => handleItemFieldEdit(item.id, 'artistOrMaker', e.target.value)}
                                  className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-2.5 py-1 text-[11px] text-amber-300/90 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                                  placeholder="Artist / Winery / Brand (Optional)"
                                />

                                {item.reason && (
                                  <span className="text-[10px] text-zinc-500 truncate max-w-[200px]" title={item.reason}>
                                    Note: {item.reason}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Category Quick Picker & Price */}
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              {/* Price Input */}
                              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono">
                                <span className="text-zinc-500 text-[10px]">{item.currency || 'USD'}</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.price !== null && item.price !== undefined ? item.price : ''}
                                  onChange={(e) =>
                                    handleItemFieldEdit(
                                      item.id,
                                      'price',
                                      e.target.value ? parseFloat(e.target.value) : null
                                    )
                                  }
                                  className="w-16 bg-transparent text-amber-400 font-bold focus:outline-none"
                                  placeholder="Price"
                                />
                              </div>

                              {/* Category Dropdown Picker */}
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  handleItemCategoryChange(
                                    item.id,
                                    e.target.value as CategoryType | 'unidentified'
                                  )
                                }
                                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition-colors ${
                                  isPending
                                    ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-md'
                                    : catInfo
                                    ? `${catInfo.bgColor} ${catInfo.color} ${catInfo.borderColor}`
                                    : 'bg-zinc-800 text-white border-zinc-700'
                                }`}
                              >
                                <option value="unidentified" className="bg-zinc-900 text-amber-400">
                                  ⚠️ Unidentified (Pending List)
                                </option>
                                {CATEGORIES.map((cat) => (
                                  <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                                    {cat.name}
                                  </option>
                                ))}
                              </select>

                              {/* Remove Item Button */}
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                                title="Remove line item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Save All to Vault Action Button */}
                <div className="pt-3 border-t border-zinc-800 flex flex-col gap-3">
                  <p className="text-xs text-zinc-400">
                    Ready to save <strong className="text-amber-400">{extractedItems.length} items</strong> into your Vault collection.
                    {duplicateCount > 0 && (
                      <span className="text-rose-300">
                        {' '}
                        ({duplicateCount} look like items you already own — you can still add them if you bought them again)
                      </span>
                    )}
                    .
                    {pendingCount > 0 && (
                      <span className="text-amber-400 ml-1">
                        ({pendingCount} item(s) will be flagged in your Pending List for later manual update).
                      </span>
                    )}
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptResult(null);
                        setExtractedItems([]);
                        setErrorMsg(null);
                        setPhoto(null);
                        setPastedText('');
                        setActiveTab('all');
                      }}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-amber-300 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Scan New Receipt</span>
                    </button>

                    <button
                      onClick={handleConfirmSaveAll}
                      disabled={extractedItems.length === 0}
                      className="flex-[1.4] py-3.5 px-6 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      <span>
                        Bulk Add {categorizedCount} Categorized
                        {pendingCount > 0 ? ` + ${pendingCount} Pending` : ''} to Vault
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => {
          setPhoto(img);
          setReceiptResult(null);
        }}
        title="Snap Receipt Photo"
      />
    </>
  );
};
