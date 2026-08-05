import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const ICONS_DIR = path.join(DATA_DIR, "icons");
const CACHE_INDEX_FILE = path.join(ICONS_DIR, "cache-index.json");

const FETCH_TIMEOUT_MS = 10000;
/** Product photos should be larger than tiny favicons/logos. */
const MIN_ICON_BYTES = 2_500;
const MAX_ICON_BYTES = 5 * 1024 * 1024;

const USER_AGENT =
  "CollectorsVault/1.0 (personal collection manager; icon lookup)";

export interface IconLookupRequest {
  query: string;
  brand?: string;
  category?: string;
  forceRefresh?: boolean;
}

export interface IconLookupResult {
  found: boolean;
  iconUrl?: string;
  cached?: boolean;
  source?: string;
  cacheKey?: string;
  error?: string;
}

interface CacheEntry {
  id: string;
  file: string;
  mimeType: string;
  source: string;
  domain?: string;
  query: string;
  updatedAt: string;
}

type CacheIndex = Record<string, CacheEntry>;

interface Candidate {
  url: string;
  source: string;
  domain?: string;
  /** Higher = preferred */
  score: number;
}

/** In-flight lookups keyed by cache key — avoids duplicate downloads for the same query. */
const inflight = new Map<string, Promise<IconLookupResult>>();

function ensureIconDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
  if (!fs.existsSync(CACHE_INDEX_FILE)) {
    fs.writeFileSync(CACHE_INDEX_FILE, "{}", "utf8");
  }
}

function readCacheIndex(): CacheIndex {
  ensureIconDirs();
  try {
    return JSON.parse(fs.readFileSync(CACHE_INDEX_FILE, "utf8")) as CacheIndex;
  } catch {
    return {};
  }
}

function writeCacheIndex(index: CacheIndex) {
  ensureIconDirs();
  fs.writeFileSync(CACHE_INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export function normalizeIconQuery(
  query: string,
  brand?: string,
  category?: string
): string {
  const parts = [category, brand, query]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) =>
      p
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
  return [...new Set(parts)].join(" ").trim();
}

function cacheKeyFor(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg";
  return "jpg";
}

function publicIconUrl(id: string): string {
  return `/api/icons/${id}`;
}

function searchTerm(query: string, brand?: string): string {
  return [brand, query]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ")
    .trim();
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractDomain(raw: string): string | null {
  try {
    const hostname = new URL(raw).hostname.replace(/^www\./, "");
    return hostname || null;
  } catch {
    return null;
  }
}

function upscaleItunesArtwork(url: string): string {
  // Apple artwork URLs embed size; bump to a high-res square when possible.
  return url
    .replace(/\/\d+x\d+bb(\.[a-z]+)$/i, "/600x600bb$1")
    .replace(/\/\d+x\d+bb\./i, "/600x600bb.")
    .replace(/100x100/g, "600x600")
    .replace(/60x60/g, "600x600");
}

function relevanceBonus(haystack: string, needles: string[]): number {
  const h = haystack.toLowerCase();
  let bonus = 0;
  for (const n of needles) {
    const t = n.toLowerCase().trim();
    if (!t || t.length < 2) continue;
    if (h === t) bonus += 30;
    else if (h.includes(t)) bonus += 12;
  }
  return bonus;
}

/** iTunes Search API — album / movie artwork (no API key). Tries multiple storefronts for regional releases. */
async function searchItunes(
  term: string,
  category?: string
): Promise<Candidate[]> {
  const isMovie = category === "dvd" || category === "bluray";
  const isMusic =
    !category ||
    category === "cd" ||
    category === "vinyl" ||
    category === "cassette";

  const attempts: Array<{ media: string; entity: string; base: number }> = [];
  if (isMusic) {
    attempts.push({ media: "music", entity: "album", base: 95 });
    attempts.push({ media: "music", entity: "song", base: 80 });
  }
  if (isMovie) {
    attempts.push({ media: "movie", entity: "movie", base: 95 });
  }
  if (!isMusic && !isMovie) {
    attempts.push({ media: "all", entity: "album", base: 55 });
    attempts.push({ media: "all", entity: "movie", base: 50 });
  }

  // HK/TW first — many bulk receipts in this app are Asian music releases
  const countries = isMusic ? ["hk", "tw", "jp", "us", "gb"] : ["us", "hk", "gb"];
  const candidates: Candidate[] = [];
  const needles = term.split(/\s+/).filter(Boolean);
  const seenArt = new Set<string>();

  for (const country of countries) {
    for (const attempt of attempts) {
      try {
        const url =
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
          `&country=${country}&media=${attempt.media}&entity=${attempt.entity}&limit=5`;
        const res = await fetchWithTimeout(url);
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
        for (const [idx, r] of (data.results || []).entries()) {
          const art = r.artworkUrl100 || r.artworkUrl60;
          if (!art) continue;
          const scaled = upscaleItunesArtwork(art);
          if (seenArt.has(scaled)) continue;
          seenArt.add(scaled);
          const label = `${r.collectionName || ""} ${r.trackName || ""} ${r.artistName || ""}`;
          candidates.push({
            url: scaled,
            source: `itunes-${country}-${attempt.entity}`,
            domain: extractDomain(art) || undefined,
            score:
              attempt.base -
              idx * 4 +
              relevanceBonus(label, needles) +
              (country === "hk" || country === "tw" ? 5 : 0),
          });
        }
        // If we already have strong hits, stop stacking storefronts
        if (candidates.length >= 4) {
          return candidates;
        }
      } catch (err) {
        console.warn("iTunes search failed:", err);
      }
    }
  }
  return candidates;
}

/** MusicBrainz release search → Cover Art Archive front cover. */
async function searchCoverArtArchive(
  term: string,
  brand?: string
): Promise<Candidate[]> {
  try {
    const queryParts = [`release:"${term.replace(/"/g, "")}"`];
    if (brand) queryParts.push(`artist:"${brand.replace(/"/g, "")}"`);
    const mbUrl =
      `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(queryParts.join(" AND "))}` +
      `&fmt=json&limit=5`;
    const res = await fetchWithTimeout(mbUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      releases?: Array<{ id?: string; title?: string; score?: number }>;
    };
    const candidates: Candidate[] = [];
    for (const [idx, rel] of (data.releases || []).entries()) {
      if (!rel.id) continue;
      // Cover Art Archive front image (redirects to actual file)
      candidates.push({
        url: `https://coverartarchive.org/release/${rel.id}/front-500`,
        source: "coverartarchive",
        domain: "coverartarchive.org",
        score: 90 - idx * 5 + Math.min(20, (rel.score || 0) / 5),
      });
      candidates.push({
        url: `https://coverartarchive.org/release/${rel.id}/front-250`,
        source: "coverartarchive",
        domain: "coverartarchive.org",
        score: 80 - idx * 5,
      });
    }
    return candidates;
  } catch (err) {
    console.warn("Cover Art Archive search failed:", err);
    return [];
  }
}

/** Wikipedia page summary thumbnail for the product / title (EN + ZH). */
async function searchWikipedia(
  term: string,
  brand?: string
): Promise<Candidate[]> {
  const queries = [term];
  if (brand && brand.toLowerCase() !== term.toLowerCase()) {
    queries.unshift(`${brand} ${term}`);
    queries.push(brand);
  }

  const wikis = [
    { host: "zh.wikipedia.org", bonus: 8 },
    { host: "en.wikipedia.org", bonus: 0 },
  ];

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const wiki of wikis) {
    for (const [qIdx, q] of queries.entries()) {
      try {
        const searchUrl =
          `https://${wiki.host}/w/api.php?action=opensearch&search=${encodeURIComponent(q)}` +
          `&limit=3&namespace=0&format=json`;
        const searchRes = await fetchWithTimeout(searchUrl);
        if (!searchRes.ok) continue;
        const searchData = (await searchRes.json()) as [
          string,
          string[],
          string[],
          string[],
        ];
        const titles = searchData[1] || [];

        for (const [tIdx, title] of titles.entries()) {
          const summaryUrl = `https://${wiki.host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
          const sumRes = await fetchWithTimeout(summaryUrl, {
            headers: { Accept: "application/json" },
          });
          if (!sumRes.ok) continue;
          const summary = (await sumRes.json()) as {
            thumbnail?: { source?: string; width?: number; height?: number };
            originalimage?: { source?: string };
            title?: string;
            type?: string;
          };
          if (summary.type === "disambiguation") continue;
          const img =
            summary.originalimage?.source || summary.thumbnail?.source;
          if (!img || seen.has(img)) continue;
          seen.add(img);
          const sizeBonus = Math.min(
            25,
            ((summary.thumbnail?.width || 0) + (summary.thumbnail?.height || 0)) /
              40
          );
          candidates.push({
            url: img,
            source: `wikipedia-${wiki.host.split(".")[0]}`,
            domain: wiki.host,
            score: 75 - qIdx * 8 - tIdx * 5 + sizeBonus + wiki.bonus,
          });
        }
      } catch (err) {
        console.warn("Wikipedia search failed:", err);
      }
    }
  }
  return candidates;
}

/** DuckDuckGo Instant Answer — Image field when present. */
async function searchDuckDuckGoImage(term: string): Promise<Candidate[]> {
  try {
    const url =
      `https://api.duckduckgo.com/?q=${encodeURIComponent(term)}` +
      `&format=json&no_redirect=1&no_html=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      Image?: string;
      ImageWidth?: number;
      ImageHeight?: number;
      Heading?: string;
      AbstractURL?: string;
    };
    if (!data.Image || !data.Image.startsWith("http")) return [];
    const w = data.ImageWidth || 0;
    const h = data.ImageHeight || 0;
    // Skip tiny icons
    if (w > 0 && h > 0 && w < 80 && h < 80) return [];
    return [
      {
        url: data.Image,
        source: "duckduckgo-image",
        domain: extractDomain(data.Image) || undefined,
        score: 70 + Math.min(20, (w + h) / 50),
      },
    ];
  } catch {
    return [];
  }
}

/** Open Library cover search — useful for books; weak fallback for titled products. */
async function searchOpenLibrary(term: string): Promise<Candidate[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      docs?: Array<{ cover_i?: number; title?: string }>;
    };
    const candidates: Candidate[] = [];
    for (const [idx, doc] of (data.docs || []).entries()) {
      if (!doc.cover_i) continue;
      candidates.push({
        url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        source: "openlibrary",
        domain: "openlibrary.org",
        score: 45 - idx * 5,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

async function collectProductImageCandidates(
  query: string,
  brand: string | undefined,
  category: string | undefined
): Promise<Candidate[]> {
  const term = searchTerm(query, brand);
  if (!term) return [];

  const isMusic =
    category === "cd" ||
    category === "vinyl" ||
    category === "cassette" ||
    !category;
  const isMovie = category === "dvd" || category === "bluray";

  const tasks: Array<Promise<Candidate[]>> = [
    searchItunes(term, category),
    searchWikipedia(query, brand),
    searchDuckDuckGoImage(term),
  ];

  if (isMusic) {
    tasks.push(searchCoverArtArchive(query, brand));
  }
  if (!isMusic && !isMovie) {
    // Tea / wine / teapot / painting — broader web sources
    tasks.push(searchOpenLibrary(term));
    if (brand) {
      tasks.push(searchItunes(`${brand} ${query}`, category));
    }
  }

  const settled = await Promise.allSettled(tasks);
  const candidates: Candidate[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") candidates.push(...result.value);
  }

  // Prefer title-specific images: boost URLs/scores when query words appear in source label via score already.
  // Deduplicate by URL.
  const byUrl = new Map<string, Candidate>();
  for (const c of candidates) {
    const prev = byUrl.get(c.url);
    if (!prev || c.score > prev.score) byUrl.set(c.url, c);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score);
}

async function downloadIcon(
  candidate: Candidate
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetchWithTimeout(candidate.url, {
      headers: { Accept: "image/*,*/*;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const mimeType = (res.headers.get("content-type") || "image/jpeg")
      .split(";")[0]
      .trim();
    if (mimeType.startsWith("text/") || mimeType.includes("json")) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < MIN_ICON_BYTES || buffer.length > MAX_ICON_BYTES) {
      return null;
    }
    return {
      buffer,
      mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
    };
  } catch {
    return null;
  }
}

function saveIconFile(
  cacheKey: string,
  query: string,
  buffer: Buffer,
  mimeType: string,
  source: string,
  domain?: string
): IconLookupResult {
  ensureIconDirs();
  const ext = extensionForMime(mimeType);
  const file = `${cacheKey}.${ext}`;
  fs.writeFileSync(path.join(ICONS_DIR, file), buffer);

  const entry: CacheEntry = {
    id: cacheKey,
    file,
    mimeType,
    source,
    domain,
    query,
    updatedAt: new Date().toISOString(),
  };

  const index = readCacheIndex();
  index[cacheKey] = entry;
  writeCacheIndex(index);

  return {
    found: true,
    iconUrl: publicIconUrl(cacheKey),
    cached: false,
    source,
    cacheKey,
  };
}

async function performLookup(
  query: string,
  brand: string | undefined,
  category: string | undefined,
  forceRefresh: boolean
): Promise<IconLookupResult> {
  const normalized = normalizeIconQuery(query, brand, category);
  if (!normalized) {
    return { found: false, error: "Empty query" };
  }

  const cacheKey = cacheKeyFor(normalized);
  const index = readCacheIndex();
  const existing = index[cacheKey];

  if (existing && !forceRefresh) {
    const filePath = path.join(ICONS_DIR, existing.file);
    if (fs.existsSync(filePath)) {
      return {
        found: true,
        iconUrl: publicIconUrl(existing.id),
        cached: true,
        source: existing.source,
        cacheKey: existing.id,
      };
    }
  }

  const candidates = await collectProductImageCandidates(query, brand, category);
  for (const candidate of candidates.slice(0, 10)) {
    const downloaded = await downloadIcon(candidate);
    if (!downloaded) continue;
    return saveIconFile(
      cacheKey,
      normalized,
      downloaded.buffer,
      downloaded.mimeType,
      candidate.source,
      candidate.domain
    );
  }

  return { found: false, cacheKey, error: "No suitable product image found" };
}

/**
 * Look up (or return cached) product/cover image for a bulk-imported item.
 * Concurrent identical queries share one in-flight promise.
 */
export async function lookupIcon(req: IconLookupRequest): Promise<IconLookupResult> {
  const query = (req.query || "").trim();
  const brand = req.brand?.trim() || undefined;
  const category = req.category?.trim() || undefined;
  const forceRefresh = !!req.forceRefresh;
  const normalized = normalizeIconQuery(query, brand, category);
  if (!normalized) return { found: false, error: "Empty query" };

  const cacheKey = cacheKeyFor(normalized);
  const inflightKey = `${cacheKey}:${forceRefresh ? "1" : "0"}`;

  const existing = inflight.get(inflightKey);
  if (existing) return existing;

  const promise = performLookup(query, brand, category, forceRefresh).finally(
    () => {
      inflight.delete(inflightKey);
    }
  );
  inflight.set(inflightKey, promise);
  return promise;
}

export function getCachedIconFile(
  id: string
): { filePath: string; mimeType: string } | null {
  ensureIconDirs();
  if (!/^[a-f0-9]+$/i.test(id)) return null;

  const index = readCacheIndex();
  const entry = index[id];
  if (entry) {
    const filePath = path.join(ICONS_DIR, entry.file);
    if (fs.existsSync(filePath)) {
      return { filePath, mimeType: entry.mimeType };
    }
  }

  try {
    const files = fs.readdirSync(ICONS_DIR);
    const match = files.find((f) => f.startsWith(id + "."));
    if (match) {
      const ext = path.extname(match).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "application/octet-stream";
      return { filePath: path.join(ICONS_DIR, match), mimeType: mime };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getIconsDir(): string {
  ensureIconDirs();
  return ICONS_DIR;
}
