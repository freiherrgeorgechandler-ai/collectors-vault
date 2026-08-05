export type CategoryType =
  | 'vinyl'
  | 'painting'
  | 'cd'
  | 'dvd'
  | 'bluray'
  | 'cassette'
  | 'chinese_tea'
  | 'wine'
  | 'teapot';

export interface CategoryInfo {
  id: CategoryType;
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  defaultFormat: string;
}

export type ItemCondition = 'Mint' | 'Near Mint' | 'Very Good' | 'Good' | 'Fair' | 'Aged/Vintage' | 'New/Sealed';

export interface CollectionItem {
  id: string;
  title: string;
  category: CategoryType;
  price: number | null;
  currency: string; // e.g. "USD", "EUR", "GBP", "HKD", "CNY", "SGD", "MYR", "JPY"
  storageLocation: string; // e.g., "Cabinet A - Shelf 2"
  year?: number | string;
  country?: string;
  purchasedDate?: string; // Month Year e.g. "2023-08"
  purchasedSource?: string; // e.g. "Record Store NYC" or "Estate Auction"
  
  // Media / Photos
  frontImage: string;
  backImage?: string;
  extraImages?: string[];

  // Media (CD, Vinyl, Cassette, DVD, Blu-ray)
  artistName?: string;
  genre?: string;
  genreContent?: string; // Tracklist, synopsis, special contents
  format?: string; // CD, LP 33RPM, Cassette, 4K UHD, etc.
  directorOrStudio?: string;

  // Chinese Tea
  teaType?: string; // Puer Sheng, Puer Shou, Oolong, Green, White, Black, Dark, Rock Tea
  teaOrigin?: string; // e.g., "Yunnan Menghai", "Wuyi Mountains"
  weightGrams?: number;
  factoryOrBrand?: string; // e.g., "Dayi 7542", "Xiaguan"
  storageCondition?: string; // Dry Storage, Natural Storage
  tastingNotes?: string;
  optimalSteeping?: string; // e.g., "95°C / 10s flash steeping"

  // Teapot
  clayType?: string; // Zini, Zhuni, Duanni, Dahongpao, Yixing Zisha
  makerArtist?: string; // Master Seal / Signature
  capacityMl?: number; // e.g., 180 ml
  craftStyle?: string; // Full Handmade, Semi Handmade
  dedicatedTeaType?: string; // e.g. "Dedicated to Aged Raw Puer"
  hasCertificate?: boolean;

  // Wine
  wineType?: string; // Red, White, Rosé, Sparkling, Dessert
  wineryProducer?: string; // Chateau Margaux, Penfolds
  region?: string; // Bordeaux, Napa Valley, Barossa
  grapeVariety?: string; // Cabernet Sauvignon, Pinot Noir
  abvPercent?: number; // e.g. 13.5%
  drinkingWindow?: string; // e.g. "2025 - 2040"

  // Painting
  paintingMedium?: string; // Oil on Canvas, Ink & Wash, Acrylic, Watercolor
  dimensions?: string; // e.g. "60 x 80 cm"
  framingStatus?: string; // Framed, Unframed, Stretched
  signatureLocation?: string; // e.g., "Bottom right signed"
  provenance?: string; // Certificate / Gallery history

  // General Meta
  condition: ItemCondition;
  rating: number; // 1 to 5
  favorite: boolean;
  wishlist: boolean; // true = wanted/wishlist, false = owned collection
  isPendingCategory?: boolean; // true if item is unidentifiable or awaiting category confirmation from receipt upload
  pendingReason?: string; // details on why item category was flagged as pending
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  category: CategoryType | 'unidentified';
  isPending: boolean;
  confidence?: 'high' | 'medium' | 'low';
  reason?: string;
  artistOrMaker?: string;
}

export interface ReceiptScanResult {
  vendorName?: string;
  purchaseDate?: string;
  currency?: string;
  totalAmount?: number;
  items: ReceiptItem[];
}

export type ViewMode = 'grid' | 'list' | 'location' | 'analytics' | 'wishlist';

export interface FilterState {
  searchQuery: string;
  category: CategoryType | 'all';
  storageLocation: string | 'all';
  condition: string | 'all';
  sortBy: 'dateAdded' | 'title' | 'priceAsc' | 'priceDesc' | 'year' | 'rating';
  wishlistOnly: boolean;
  favoritesOnly: boolean;
  pendingOnly?: boolean;
}
