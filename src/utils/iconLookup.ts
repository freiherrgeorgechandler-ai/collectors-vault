import type { CollectionItem, CategoryType } from '../types';
import { apiUrl } from './apiBase';

/** Shared placeholder used for bulk-added items while icon search runs. */
export const BULK_ICON_PLACEHOLDER =
  'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=800&auto=format&fit=crop&q=80';

/** Local SVG placeholder — always loads even if Unsplash is blocked. */
export const BULK_ICON_PLACEHOLDER_LOCAL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect fill="#18181b" width="800" height="600"/>
      <rect x="280" y="180" width="240" height="240" rx="24" fill="#27272a" stroke="#f59e0b" stroke-width="3"/>
      <text x="400" y="440" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-size="22">Finding cover…</text>
    </svg>`
  );

export const ICON_MISSING_PENDING_REASON =
  'No suitable product image found online for this item. Please upload a photo and confirm the details.';

export interface IconLookupResponse {
  found: boolean;
  iconUrl?: string;
  cached?: boolean;
  source?: string;
  cacheKey?: string;
  error?: string;
}

export function isReplaceablePlaceholder(frontImage: string | undefined | null): boolean {
  if (!frontImage) return true;
  if (frontImage === BULK_ICON_PLACEHOLDER) return true;
  if (frontImage === BULK_ICON_PLACEHOLDER_LOCAL) return true;
  if (frontImage.startsWith('/api/icons/')) return false;
  if (frontImage.includes('images.unsplash.com/photo-1554415707-6e8cfc93fe23')) return true;
  if (frontImage.startsWith('data:image/svg+xml')) return true;
  return false;
}

/** Clean receipt titles like "Artist - Album…" into a better search string. */
export function cleanTitleForSearch(title: string, artist?: string): string {
  let t = (title || '').trim();
  if (!t) return '';

  t = t.replace(/[.…]+$/u, '').trim();
  // Strip format suffixes that hurt search
  t = t.replace(/\s*\((?:CD|SACD|LP|EP|Vinyl|BLU-?RAY|DVD|4K|Cassette)[^)]*\)\s*$/i, '').trim();

  const artistNorm = (artist || '').trim();
  if (artistNorm) {
    const esc = artistNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`^${esc}\\s*[-–—:]\\s*`, 'i'), '').trim();
  }

  t = t.replace(/^va\s*[-–—:]\s*/i, '').trim();

  const parts = t.split(/\s+[-–—]\s+/);
  if (parts.length >= 2 && parts[0].length <= 40) {
    const maybeAlbum = parts.slice(1).join(' - ').trim();
    if (maybeAlbum.length >= 2) t = maybeAlbum;
  }

  return t || (title || '').trim();
}

export function buildIconSearchQuery(
  item: Pick<
    CollectionItem,
    | 'title'
    | 'category'
    | 'artistName'
    | 'factoryOrBrand'
    | 'wineryProducer'
    | 'makerArtist'
    | 'directorOrStudio'
  >
): {
  query: string;
  brand?: string;
  category?: CategoryType;
} {
  const brand =
    item.artistName ||
    item.factoryOrBrand ||
    item.wineryProducer ||
    item.makerArtist ||
    item.directorOrStudio ||
    undefined;

  const title = cleanTitleForSearch(item.title || '', brand);
  return {
    query: title || brand?.trim() || 'collection item',
    brand: brand?.trim() || undefined,
    category: item.category,
  };
}

/**
 * Items that still show the old bulk bug: identical shared data: image on 2+ cards,
 * or receipt bulk notes with a data: frontImage (the receipt screenshot).
 */
export function findItemsNeedingIconRepair(items: CollectionItem[]): CollectionItem[] {
  const dataUrlGroups = new Map<string, CollectionItem[]>();
  for (const item of items) {
    if (!item.frontImage?.startsWith('data:image/') || item.frontImage.startsWith('data:image/svg+xml')) {
      continue;
    }
    const group = dataUrlGroups.get(item.frontImage) || [];
    group.push(item);
    dataUrlGroups.set(item.frontImage, group);
  }

  const needing = new Map<string, CollectionItem>();

  for (const group of dataUrlGroups.values()) {
    if (group.length >= 2) {
      for (const item of group) needing.set(item.id, item);
    }
  }

  for (const item of items) {
    if (needing.has(item.id)) continue;
    // Already marked as image-missing — don't keep retrying forever
    if ((item.pendingReason || '').includes('No suitable product image found')) continue;

    const fromBulk =
      /bulk added via receipt/i.test(item.notes || '') ||
      String(item.id || '').startsWith('item-receipt-');
    if (!fromBulk) continue;

    // Still has receipt/camera data URL (not our svg placeholder)
    if (item.frontImage?.startsWith('data:image/') && !item.frontImage.startsWith('data:image/svg+xml')) {
      needing.set(item.id, item);
    }
  }

  return [...needing.values()];
}

function upscaleItunesArtwork(url: string): string {
  return url
    .replace(/\/\d+x\d+bb(\.[a-z]+)$/i, '/600x600bb$1')
    .replace(/100x100/g, '600x600')
    .replace(/60x60/g, '600x600');
}

/** Browser-side iTunes Search (CORS-enabled) — works even if server icon API is down. */
async function lookupItunesInBrowser(
  query: string,
  brand?: string,
  category?: string
): Promise<string | null> {
  const term = [brand, query].filter((p) => p && p.trim()).join(' ').trim() || query;
  if (!term) return null;

  const isMovie = category === 'dvd' || category === 'bluray';
  const media = isMovie ? 'movie' : 'music';
  const entity = isMovie ? 'movie' : 'album';
  const countries = ['hk', 'tw', 'jp', 'us', 'gb'];

  for (const country of countries) {
    try {
      const url =
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
        `&country=${country}&media=${media}&entity=${entity}&limit=5`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        results?: Array<{
          artworkUrl100?: string;
          artworkUrl60?: string;
          collectionName?: string;
          trackName?: string;
          artistName?: string;
        }>;
      };
      const results = data.results || [];
      if (results.length === 0) continue;

      // Prefer result whose name overlaps our query
      const qLower = term.toLowerCase();
      const ranked = [...results].sort((a, b) => {
        const la = `${a.collectionName || ''} ${a.trackName || ''} ${a.artistName || ''}`.toLowerCase();
        const lb = `${b.collectionName || ''} ${b.trackName || ''} ${b.artistName || ''}`.toLowerCase();
        const sa = la.includes(qLower) || qLower.split(/\s+/).some((w) => w.length > 2 && la.includes(w)) ? 1 : 0;
        const sb = lb.includes(qLower) || qLower.split(/\s+/).some((w) => w.length > 2 && lb.includes(w)) ? 1 : 0;
        return sb - sa;
      });

      const art = ranked[0]?.artworkUrl100 || ranked[0]?.artworkUrl60;
      if (art) return upscaleItunesArtwork(art);
    } catch (err) {
      console.warn('[icons] iTunes browser lookup failed:', err);
    }
  }
  return null;
}

export async function lookupItemIcon(
  item: Pick<
    CollectionItem,
    | 'title'
    | 'category'
    | 'artistName'
    | 'factoryOrBrand'
    | 'wineryProducer'
    | 'makerArtist'
    | 'directorOrStudio'
  >,
  options?: { forceRefresh?: boolean }
): Promise<IconLookupResponse> {
  const { query, brand, category } = buildIconSearchQuery(item);

  // 1) Prefer server cache/download API
  try {
    const res = await fetch(apiUrl('/api/icons/lookup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        brand,
        category,
        forceRefresh: !!options?.forceRefresh,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as IconLookupResponse;
      if (data.found && data.iconUrl) return data;
    } else {
      console.warn('[icons] Server lookup unavailable:', res.status);
    }
  } catch (err: any) {
    console.warn('[icons] Server lookup error:', err?.message || err);
  }

  // 2) Fallback: iTunes directly in the browser (no server restart required)
  const itunesUrl = await lookupItunesInBrowser(query, brand, category);
  if (itunesUrl) {
    return { found: true, iconUrl: itunesUrl, source: 'itunes-browser', cached: false };
  }

  return { found: false, error: 'No suitable product image found' };
}

/** Resolve product images for bulk items with limited concurrency; never throws. */
export async function resolveIconsForItems(
  items: CollectionItem[],
  onResolved: (itemId: string, iconUrl: string | null) => void,
  concurrency = 2,
  options?: { forceRefresh?: boolean }
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const result = await lookupItemIcon(item, {
          forceRefresh: !!options?.forceRefresh,
        });
        if (result.found && result.iconUrl) {
          onResolved(item.id, result.iconUrl);
        } else {
          onResolved(item.id, null);
        }
      } catch (err) {
        console.warn('Icon lookup failed for item:', item.title, err);
        onResolved(item.id, null);
      }
    }
  });
  await Promise.all(workers);
}
