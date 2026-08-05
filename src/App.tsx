import React, { useState, useEffect, useMemo } from 'react';
import { CollectionItem, ViewMode, FilterState, CategoryType } from './types';
import { getStoredItems, saveItems, resetToSampleData } from './utils/storage';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ItemCard } from './components/ItemCard';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { AnalyticsView } from './components/AnalyticsView';
import { StorageLocationView } from './components/StorageLocationView';
import { WishlistView } from './components/WishlistView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ExportImportModal } from './components/ExportImportModal';
import { AuthModal } from './components/AuthModal';
import { OfflineBanner } from './components/OfflineBanner';
import {
  VaultUser,
  fetchSessionUser,
  fetchVaultItems,
  saveVaultItems,
  getSavedUser,
} from './lib/serverAuth';
import { SAMPLE_ITEMS } from './data/sampleData';
import { CATEGORY_MAP } from './data/categories';
import {
  BULK_ICON_PLACEHOLDER_LOCAL,
  ICON_MISSING_PENDING_REASON,
  findItemsNeedingIconRepair,
  resolveIconsForItems,
} from './utils/iconLookup';
import {
  Plus,
  Search,
  Layers,
  MapPin,
  Star,
  Tag,
  DollarSign,
  Heart,
  Eye,
  Edit2,
  Trash2,
  PackageOpen,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<CollectionItem[]>(() => getStoredItems());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [iconLoadingIds, setIconLoadingIds] = useState<Set<string>>(() => new Set());
  const iconRepairQueuedRef = React.useRef<Set<string>>(new Set());

  const isBulkDefaultOrSharedReceipt = (frontImage: string) => {
    if (!frontImage) return true;
    if (frontImage === BULK_ICON_PLACEHOLDER_LOCAL) return true;
    if (frontImage.startsWith('data:image/') && !frontImage.startsWith('data:image/svg+xml')) return true;
    if (frontImage.startsWith('data:image/svg+xml')) return true;
    if (frontImage.includes('images.unsplash.com/photo-1554415707-6e8cfc93fe23')) return true;
    return false;
  };

  /** Apply async product-image results; always overwrite for these item ids (bulk / repair). */
  const applyIconLookupResults = (
    targetIds: Set<string>,
    itemId: string,
    iconUrl: string | null
  ) => {
    if (!targetIds.has(itemId)) return;

    setIconLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        if (iconUrl) {
          return {
            ...item,
            frontImage: iconUrl,
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          ...item,
          frontImage: isBulkDefaultOrSharedReceipt(item.frontImage)
            ? BULK_ICON_PLACEHOLDER_LOCAL
            : item.frontImage,
          isPendingCategory: true,
          pendingReason: item.pendingReason
            ? `${item.pendingReason} | ${ICON_MISSING_PENDING_REASON}`
            : ICON_MISSING_PENDING_REASON,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    storageLocation: 'all',
    condition: 'all',
    sortBy: 'dateAdded',
    wishlistOnly: false,
    favoritesOnly: false,
  });

  const startIconLookups = (batch: CollectionItem[], opts?: { forceRefresh?: boolean }) => {
    if (batch.length === 0) return;
    const targetIds = new Set(batch.map((i) => i.id));
    batch.forEach((i) => iconRepairQueuedRef.current.add(i.id));

    // Show placeholder + spinner while searching (clears shared receipt screenshots)
    setItems((prev) =>
      prev.map((item) =>
        targetIds.has(item.id)
          ? {
              ...item,
              frontImage: BULK_ICON_PLACEHOLDER_LOCAL,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    setIconLoadingIds((prev) => {
      const next = new Set(prev);
      batch.forEach((i) => next.add(i.id));
      return next;
    });

    let missCount = 0;
    void resolveIconsForItems(
      batch,
      (itemId, iconUrl) => {
        if (!iconUrl) missCount += 1;
        applyIconLookupResults(targetIds, itemId, iconUrl);
      },
      2,
      opts
    ).then(() => {
      if (missCount > 0) {
        setFilters((prev) => ({
          ...prev,
          category: 'all',
          pendingOnly: true,
          searchQuery: '',
        }));
      }
    });
  };

  // Server account + central vault
  const [currentUser, setCurrentUser] = useState<VaultUser | null>(() => getSavedUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudReady, setCloudReady] = useState(false);
  const skipCloudPushRef = React.useRef(false);

  const loadServerVault = async (user: VaultUser) => {
    setSyncStatus('syncing');
    setCloudReady(false);
    try {
      let serverItems = await fetchVaultItems();

      // First login: migrate real local items up to the server vault
      if (serverItems.length === 0) {
        const localItems = getStoredItems();
        const sampleIds = new Set(SAMPLE_ITEMS.map((s) => s.id));
        const localReal = localItems.filter((i) => !sampleIds.has(i.id));
        if (localReal.length > 0) {
          await saveVaultItems(localReal);
          serverItems = localReal;
        }
      }

      skipCloudPushRef.current = true;
      setItems(serverItems);
      setSyncStatus('synced');
      setCloudReady(true);
    } catch (err) {
      console.error('Server vault load failed:', err);
      setSyncStatus('error');
      setCloudReady(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await fetchSessionUser();
      if (cancelled) return;
      setCurrentUser(user);
      if (user) {
        await loadServerVault(user);
      } else {
        setSyncStatus('idle');
        setCloudReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthChange = async (user: VaultUser | null) => {
    setCurrentUser(user);
    if (!user) {
      setSyncStatus('idle');
      setCloudReady(false);
      skipCloudPushRef.current = true;
      setItems(getStoredItems());
      return;
    }
    await loadServerVault(user);
  };

  // Modals state
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  // Always mirror to localStorage as offline/recovery cache
  useEffect(() => {
    saveItems(items);
  }, [items]);

  // Repair items that still share the same receipt screenshot as frontImage
  useEffect(() => {
    if (items.length === 0) return;
    // Wait until vault sync settles so we don't fight a server reload
    if (currentUser && !cloudReady) return;

    const needing = findItemsNeedingIconRepair(items).filter(
      (i) => !iconRepairQueuedRef.current.has(i.id)
    );
    if (needing.length === 0) return;

    needing.forEach((i) => iconRepairQueuedRef.current.add(i.id));
    console.info(
      `[icons] Repairing ${needing.length} bulk item(s) that share a receipt screenshot.`
    );
    startIconLookups(needing, { forceRefresh: true });
  }, [items, currentUser, cloudReady]);

  // Push local edits to central server vault when signed in
  useEffect(() => {
    if (!currentUser || !cloudReady) return;
    if (skipCloudPushRef.current) {
      skipCloudPushRef.current = false;
      return;
    }

    setSyncStatus('syncing');
    const timer = window.setTimeout(() => {
      saveVaultItems(items)
        .then(() => setSyncStatus('synced'))
        .catch((err) => {
          console.error('Server sync failed:', err);
          setSyncStatus('error');
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [items, currentUser, cloudReady]);

  // Filtered & Sorted items calculation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Pending list filter
      if (filters.pendingOnly && !item.isPendingCategory) {
        return false;
      }
      // Category match
      if (filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }
      // Favorites filter
      if (filters.favoritesOnly && !item.favorite) {
        return false;
      }
      // Wishlist filter (if set from sub-nav or view)
      if (filters.wishlistOnly && !item.wishlist) {
        return false;
      }
      // Non-wishlist view should hide wishlist unless explicitly in wishlist view mode or wishlist filter
      if (viewMode !== 'wishlist' && item.wishlist && !filters.wishlistOnly) {
        return false;
      }

      // Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const artistMatch = (
          item.artistName ||
          item.makerArtist ||
          item.wineryProducer ||
          item.directorOrStudio ||
          item.factoryOrBrand ||
          ''
        )
          .toLowerCase()
          .includes(q);
        const locMatch = item.storageLocation?.toLowerCase().includes(q);
        const teaMatch = (item.teaType || item.tastingNotes || '').toLowerCase().includes(q);
        const clayMatch = (item.clayType || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);

        if (!titleMatch && !artistMatch && !locMatch && !teaMatch && !clayMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (filters.sortBy === 'priceDesc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (filters.sortBy === 'priceAsc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (filters.sortBy === 'year') {
        return Number(b.year || 0) - Number(a.year || 0);
      }
      if (filters.sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Default: dateAdded (newest first)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [items, filters, viewMode]);

  // Total valuation calculation
  const totalValuation = useMemo(() => {
    return items
      .filter((i) => !i.wishlist)
      .reduce((acc, i) => acc + (i.price || 0), 0);
  }, [items]);

  // Handlers
  const handleSaveItem = (itemData: Partial<CollectionItem>) => {
    if (editingItem) {
      // Edit existing
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? ({
                ...i,
                ...itemData,
                updatedAt: new Date().toISOString(),
              } as CollectionItem)
            : i
        )
      );
      setEditingItem(null);
    } else {
      // Create new
      const newItem: CollectionItem = {
        id: `item-${Date.now()}`,
        title: itemData.title || 'Untitled Item',
        category: itemData.category || 'cd',
        price: itemData.price !== undefined ? itemData.price : null,
        currency: itemData.currency || 'USD',
        storageLocation: itemData.storageLocation || 'Main Display Shelf',
        year: itemData.year || '',
        country: itemData.country || '',
        purchasedDate: itemData.purchasedDate || '',
        purchasedSource: itemData.purchasedSource || '',
        frontImage:
          itemData.frontImage ||
          'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=800&auto=format&fit=crop&q=80',
        backImage: itemData.backImage || '',
        artistName: itemData.artistName || '',
        genre: itemData.genre || '',
        genreContent: itemData.genreContent || '',
        format: itemData.format || '',
        teaType: itemData.teaType || '',
        teaOrigin: itemData.teaOrigin || '',
        weightGrams: itemData.weightGrams,
        factoryOrBrand: itemData.factoryOrBrand || '',
        storageCondition: itemData.storageCondition || '',
        tastingNotes: itemData.tastingNotes || '',
        optimalSteeping: itemData.optimalSteeping || '',
        clayType: itemData.clayType || '',
        makerArtist: itemData.makerArtist || '',
        capacityMl: itemData.capacityMl,
        craftStyle: itemData.craftStyle || '',
        dedicatedTeaType: itemData.dedicatedTeaType || '',
        hasCertificate: !!itemData.hasCertificate,
        wineType: itemData.wineType || '',
        wineryProducer: itemData.wineryProducer || '',
        region: itemData.region || '',
        grapeVariety: itemData.grapeVariety || '',
        abvPercent: itemData.abvPercent,
        drinkingWindow: itemData.drinkingWindow || '',
        paintingMedium: itemData.paintingMedium || '',
        dimensions: itemData.dimensions || '',
        framingStatus: itemData.framingStatus || '',
        signatureLocation: itemData.signatureLocation || '',
        provenance: itemData.provenance || '',
        condition: itemData.condition || 'Near Mint',
        rating: itemData.rating || 5,
        favorite: !!itemData.favorite,
        wishlist: !!itemData.wishlist,
        notes: itemData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  const handleSaveBatchItems = (batchData: Partial<CollectionItem>[]) => {
    const newItems: CollectionItem[] = batchData.map((itemData, idx) => ({
      id: `item-receipt-${Date.now()}-${idx}`,
      title: itemData.title || 'Receipt Item',
      category: itemData.category || 'cd',
      price: itemData.price !== undefined ? itemData.price : null,
      currency: itemData.currency || 'USD',
      storageLocation: itemData.storageLocation || 'Main Display Shelf',
      year: itemData.year || '',
      country: itemData.country || '',
      purchasedDate: itemData.purchasedDate || new Date().toISOString().split('T')[0],
      purchasedSource: itemData.purchasedSource || 'Receipt Purchase',
      frontImage: BULK_ICON_PLACEHOLDER_LOCAL,
      backImage: '',
      artistName: itemData.artistName || itemData.makerArtist || itemData.wineryProducer || '',
      factoryOrBrand: itemData.factoryOrBrand || '',
      wineryProducer: itemData.wineryProducer || '',
      makerArtist: itemData.makerArtist || '',
      genre: '',
      genreContent: '',
      format: '',
      condition: itemData.condition || 'Near Mint',
      rating: 5,
      favorite: false,
      wishlist: false,
      isPendingCategory: !!itemData.isPendingCategory,
      pendingReason: itemData.pendingReason || '',
      notes: itemData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setItems((prev) => [...newItems, ...prev]);

    // Per-item online cover search (async). Clears any shared receipt image.
    startIconLookups(newItems);

    const pendingAdded = newItems.filter((i) => i.isPendingCategory).length;
    const categorizedAdded = newItems.length - pendingAdded;

    if (pendingAdded > 0) {
      setFilters((prev) => ({
        ...prev,
        category: 'all',
        pendingOnly: true,
        searchQuery: '',
      }));
      window.alert(
        `Bulk add complete.\n\n` +
          `✓ ${categorizedAdded} item(s) categorized and added to your vault.\n` +
          `⚠ ${pendingAdded} item(s) could not be fully identified and were sent to the Pending List.\n\n` +
          `Cover images are loading in the background.\n` +
          `Items without a found image will also move to the Pending List.`
      );
    } else {
      window.alert(
        `Bulk add complete.\n\n✓ ${newItems.length} item(s) recognized and added to your vault.\n` +
          `Cover images are loading in the background.\n` +
          `Any item without a suitable online image will be moved to the Pending List.`
      );
    }
  };

  const pendingCount = useMemo(() => {
    return items.filter((i) => i.isPendingCategory).length;
  }, [items]);

  // ---- Bulk select / delete ----
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleIds = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (visibleIds.length === 0) return prev;
      const allSelected = visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  /** Shared delete core used by single-item and bulk delete. */
  const removeItemsByIds = (ids: string[]) => {
    if (ids.length === 0) return 0;
    const idSet = new Set(ids);
    const deletedCount = items.filter((i) => idSet.has(i.id)).length;
    setItems((prev) => prev.filter((i) => !idSet.has(i.id)));
    if (selectedItem && idSet.has(selectedItem.id)) {
      setSelectedItem(null);
    }
    return deletedCount;
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        removeItemsByIds([id]);
        setSelectedIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        console.error(err);
        window.alert('Failed to delete the item. Please try again.');
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const confirmed = window.confirm(
      `⚠️ Warning\n\n` +
        `You are about to permanently delete ${count} selected item(s).\n\n` +
        `This action cannot be undone.\n\n` +
        `OK = Delete\n` +
        `Cancel = Keep items`
    );

    if (!confirmed) return;

    try {
      const ids = [...selectedIds];
      const deleted = removeItemsByIds(ids);
      setSelectedIds(new Set());
      setSelectMode(false);
      window.alert(
        deleted > 0
          ? `Successfully deleted ${deleted} item(s).`
          : 'No matching items were found to delete.'
      );
    } catch (err) {
      console.error(err);
      window.alert(
        'Something went wrong while deleting. Your list was not left half-updated — please try again.'
      );
    }
  };

  const handleToggleFavorite = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i))
    );
  };

  const handleResetData = () => {
    if (confirm('Reset collection data back to default sample records?')) {
      const resetData = resetToSampleData();
      setItems(resetData);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      <OfflineBanner />
      {/* Top Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        filters={filters}
        setFilters={setFilters}
        onAddNew={() => {
          setEditingItem(null);
          setIsFormOpen(true);
        }}
        onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onResetData={handleResetData}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        totalCount={items.filter((i) => !i.wishlist).length}
        totalValue={`$${totalValuation.toLocaleString()}`}
        pendingCount={pendingCount}
      />

      {/* Category Navigation Bar (when in grid/list view) */}
      {(viewMode === 'grid' || viewMode === 'list') && (
        <CategoryNav filters={filters} setFilters={setFilters} items={items} />
      )}

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {/* Analytics View Mode */}
        {viewMode === 'analytics' && <AnalyticsView items={items} />}

        {/* Storage Location View Mode */}
        {viewMode === 'location' && (
          <StorageLocationView
            items={items}
            onSelect={(item) => setSelectedItem(item)}
            onAddNew={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
          />
        )}

        {/* Wishlist View Mode */}
        {viewMode === 'wishlist' && (
          <WishlistView
            items={items}
            onSelect={(item) => setSelectedItem(item)}
            onEdit={(item) => {
              setEditingItem(item);
              setIsFormOpen(true);
            }}
            onDelete={handleDeleteItem}
            onToggleFavorite={handleToggleFavorite}
            onAddNewWishlist={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
          />
        )}

        {/* Grid & List View Modes */}
        {(viewMode === 'grid' || viewMode === 'list') && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Empty State */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-zinc-800 p-8 space-y-3">
                <PackageOpen className="w-12 h-12 mx-auto text-zinc-600" />
                <h3 className="text-lg font-bold text-zinc-200">No Collection Items Found</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  No records match your active category or search filter. Add a new item with camera photo and AI auto-fill.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setIsFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Select Mode toolbar — grid & list */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!selectMode ? (
                      <button
                        type="button"
                        onClick={() => setSelectMode(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold hover:border-zinc-600 hover:text-white transition-colors"
                        title="Select multiple items to delete"
                      >
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                        <span>Select Mode</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={exitSelectMode}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={toggleSelectAllVisible}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                        >
                          {allVisibleSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                          <span>{allVisibleSelected ? 'Deselect All' : 'Select All'}</span>
                        </button>
                        <span className="text-xs text-zinc-400 font-medium px-1">
                          {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
                        </span>
                      </>
                    )}
                  </div>

                  {selectMode && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/90 text-white text-xs font-bold hover:bg-rose-500 transition-colors shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-600/90"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
                    </button>
                  )}
                </div>

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onSelect={(i) => setSelectedItem(i)}
                        onEdit={(i) => {
                          setEditingItem(i);
                          setIsFormOpen(true);
                        }}
                        onDelete={handleDeleteItem}
                        onToggleFavorite={handleToggleFavorite}
                        selectionMode={selectMode}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={toggleSelectId}
                        iconLoading={iconLoadingIds.has(item.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Compact List View */}
                {viewMode === 'list' && (
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden shadow-lg">
                    {filteredItems.map((item) => {
                      const cat = CATEGORY_MAP[item.category];
                      const subtitle =
                        item.artistName ||
                        item.makerArtist ||
                        item.wineryProducer ||
                        item.directorOrStudio ||
                        item.factoryOrBrand ||
                        '';
                      const isChecked = selectedIds.has(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-zinc-800/50 transition-colors group ${
                            selectMode && isChecked ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          {selectMode && (
                            <label className="shrink-0 flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectId(item.id)}
                                className="w-4 h-4 accent-amber-500 cursor-pointer"
                              />
                            </label>
                          )}

                          {/* Image & Basic Info */}
                          <div
                            onClick={() => {
                              if (selectMode) toggleSelectId(item.id);
                              else setSelectedItem(item);
                            }}
                            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          >
                            <img
                              src={item.frontImage}
                              alt={item.title}
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${cat.bgColor} ${cat.color}`}
                                >
                                  {cat.name}
                                </span>
                                {item.year && (
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    {item.year}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-zinc-100 truncate mt-0.5">
                                {item.title}
                              </h4>
                              {subtitle && (
                                <p className="text-xs text-amber-400/90 truncate">{subtitle}</p>
                              )}
                            </div>
                          </div>

                          {/* Storage & Price */}
                          <div className="hidden md:flex flex-col items-end text-xs text-zinc-400">
                            <span className="inline-flex items-center gap-1 font-medium text-zinc-300">
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              {item.storageLocation || 'Unassigned'}
                            </span>
                            <span className="text-amber-400 font-bold mt-0.5 font-mono">
                              {item.price !== null ? `${item.currency || 'USD'} $${item.price.toLocaleString()}` : 'Unpriced'}
                            </span>
                          </div>

                          {/* Action Buttons — hidden in select mode to avoid confusion */}
                          {!selectMode && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setEditingItem(item);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteItem}
        onToggleFavorite={handleToggleFavorite}
      />

      <ItemFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        defaultCategory={filters.category !== 'all' ? filters.category : 'cd'}
        existingItems={items}
      />

      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onSaveBatchItems={handleSaveBatchItems}
        existingItems={items}
      />

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        items={items}
        onImportItems={(imported) => setItems(imported)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        syncStatus={syncStatus}
        onAuthChange={handleAuthChange}
      />
    </div>
  );
}
