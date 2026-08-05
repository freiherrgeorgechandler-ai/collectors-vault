import { CollectionItem, CategoryType } from '../types';
import { CATEGORIES } from '../data/categories';

export interface CategoryMismatchResult {
  hasMismatch: boolean;
  matchedKeyword: string;
  suggestedCategory: CategoryType;
  suggestedLabel: string;
}

// Format and item type keyword mapping for cross-checking category conflicts
const CATEGORY_KEYWORDS: Record<CategoryType, string[]> = {
  vinyl: ['vinyl', 'lp', '12-inch', '12"', '33 rpm', '45 rpm', 'turntable', 'record album', 'gramophone', 'wax'],
  cd: ['cd', 'compact disc', 'sacd', 'cd-r', 'jewel case', 'digipak'],
  dvd: ['dvd', 'dvd-video', 'dvd disc'],
  bluray: ['bluray', 'blu-ray', '4k uhd', 'blu ray'],
  cassette: ['cassette', 'tape', 'cassette tape', 'mc', 'analog tape'],
  chinese_tea: ['tea', 'puerh', 'pu-erh', 'oolong', 'dahongpao', 'sheng cha', 'shou cha', 'tea cake', 'tea brick', 'steeping'],
  wine: ['wine', 'winery', 'cabernet', 'bordeaux', 'chateau', 'pinot', 'shiraz', 'vintage wine', 'champagne', 'grape', 'oak barrel', 'abv'],
  teapot: ['yixing', 'zisha', 'teapot', 'clay pot', 'zhuni', 'zini', 'duanni', 'dahongpao clay', 'capacity ml'],
  painting: ['oil on canvas', 'acrylic', 'watercolor', 'lithograph', 'painting', 'framed art', 'signature location'],
};

/**
 * Checks if the current item title/artist matches an existing item in the user's collection.
 */
export function checkDuplicateItem(
  formData: Partial<CollectionItem>,
  existingItems: CollectionItem[] = [],
  currentItemId?: string
): CollectionItem | null {
  if (!formData.title || formData.title.trim().length < 2) return null;

  const normTitle = formData.title.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const item of existingItems) {
    if (currentItemId && item.id === currentItemId) continue;

    const normExistingTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Direct title match or one includes the other if string length >= 4
    const isTitleMatch =
      normTitle === normExistingTitle ||
      (normTitle.length >= 4 && normExistingTitle.length >= 4 && (normTitle.includes(normExistingTitle) || normExistingTitle.includes(normTitle)));

    if (isTitleMatch) {
      // Check secondary qualifier (artist/winery/maker) if available
      const newArtist = (formData.artistName || formData.wineryProducer || formData.factoryOrBrand || formData.makerArtist || '').toLowerCase().trim();
      const existingArtist = (item.artistName || item.wineryProducer || item.factoryOrBrand || item.makerArtist || '').toLowerCase().trim();

      if (!newArtist || !existingArtist || newArtist === existingArtist || newArtist.includes(existingArtist) || existingArtist.includes(newArtist)) {
        return item;
      }
    }
  }

  return null;
}

/**
 * Checks if the item's title, format, notes, or AI detected category contradicts the selected category.
 */
export function checkCategoryMismatch(
  formData: Partial<CollectionItem>,
  aiDetectedCategory?: string
): CategoryMismatchResult | null {
  const currentCategory = formData.category || 'cd';

  // Normalize aiDetectedCategory if string maps to chinese_tea or teapot
  let normalizedAiCat = aiDetectedCategory;
  if (normalizedAiCat === 'tea') normalizedAiCat = 'chinese_tea';
  if (normalizedAiCat === 'yixing' || normalizedAiCat === 'art') {
    if (normalizedAiCat === 'yixing') normalizedAiCat = 'teapot';
    if (normalizedAiCat === 'art') normalizedAiCat = 'painting';
  }

  // 1. Direct AI detected category mismatch override
  if (normalizedAiCat && normalizedAiCat !== currentCategory) {
    const validCategoryKeys = Object.keys(CATEGORY_KEYWORDS) as CategoryType[];
    if (validCategoryKeys.includes(normalizedAiCat as CategoryType)) {
      const matchCat = CATEGORIES.find((c) => c.id === normalizedAiCat);
      return {
        hasMismatch: true,
        matchedKeyword: `AI detected ${matchCat?.name || normalizedAiCat}`,
        suggestedCategory: normalizedAiCat as CategoryType,
        suggestedLabel: matchCat?.name || normalizedAiCat,
      };
    }
  }

  // 2. Keyword scan across title, format, and notes
  const fullText = `${formData.title || ''} ${formData.format || ''} ${formData.notes || ''} ${formData.tastingNotes || ''}`.toLowerCase();

  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const targetCat = catKey as CategoryType;
    if (targetCat === currentCategory) continue;

    for (const kw of keywords) {
      if (fullText.includes(kw)) {
        // Double check false positives (e.g. "cd" inside "accepted")
        if (kw === 'cd' && !/\bcd\b|\bcompact disc\b/i.test(fullText)) continue;
        if (kw === 'lp' && !/\blp\b/i.test(fullText)) continue;

        const matchCat = CATEGORIES.find((c) => c.id === targetCat);
        return {
          hasMismatch: true,
          matchedKeyword: kw,
          suggestedCategory: targetCat,
          suggestedLabel: matchCat?.name || targetCat,
        };
      }
    }
  }

  return null;
}
