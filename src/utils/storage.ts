import { CollectionItem } from '../types';
import { SAMPLE_ITEMS } from '../data/sampleData';
import { CATEGORY_MAP } from '../data/categories';

const STORAGE_KEY = 'collectors_vault_items_v1';

export function getStoredItems(): CollectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed initial sample data if empty
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ITEMS));
      return SAMPLE_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SAMPLE_ITEMS;
  } catch (err) {
    console.error('Failed to load items from localStorage:', err);
    return SAMPLE_ITEMS;
  }
}

export function saveItems(items: CollectionItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save items to localStorage:', err);
  }
}

export function resetToSampleData(): CollectionItem[] {
  saveItems(SAMPLE_ITEMS);
  return SAMPLE_ITEMS;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function artistOrMaker(item: CollectionItem): string {
  return (
    item.artistName ||
    item.makerArtist ||
    item.wineryProducer ||
    item.directorOrStudio ||
    item.factoryOrBrand ||
    ''
  );
}

function formatOrType(item: CollectionItem): string {
  return (
    item.format ||
    item.teaType ||
    item.clayType ||
    item.wineType ||
    item.paintingMedium ||
    ''
  );
}

function categoryLabel(category: string): string {
  return CATEGORY_MAP[category as keyof typeof CATEGORY_MAP]?.name || category;
}

/** Flat spreadsheet rows — human-readable collection listing. */
export function buildCollectionSheetRows(items: CollectionItem[]): {
  headers: string[];
  rows: (string | number)[][];
} {
  const headers = [
    'No.',
    'Category',
    'Title',
    'Artist / Maker / Producer',
    'Format / Type',
    'Year',
    'Country',
    'Condition',
    'Rating',
    'Price',
    'Currency',
    'Purchased Date',
    'Purchased From',
    'Storage Location',
    'Favorite',
    'Wishlist',
    'Pending Review',
    'Notes',
  ];

  const rows = items.map((item, idx) => [
    idx + 1,
    categoryLabel(item.category),
    item.title || '',
    artistOrMaker(item),
    formatOrType(item),
    item.year ?? '',
    item.country || '',
    item.condition || '',
    item.rating ?? '',
    item.price !== null && item.price !== undefined ? item.price : '',
    item.currency || 'USD',
    item.purchasedDate || '',
    item.purchasedSource || '',
    item.storageLocation || '',
    item.favorite ? 'Yes' : 'No',
    item.wishlist ? 'Yes' : 'No',
    item.isPendingCategory ? 'Yes' : 'No',
    item.notes || '',
  ]);

  return { headers, rows };
}

export function exportAsJSON(items: CollectionItem[]): void {
  const jsonStr = JSON.stringify(items, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `Collectors_Vault_Backup_${new Date().toISOString().split('T')[0]}.json`);
}

/** CSV that opens cleanly in Excel (UTF-8 BOM for Chinese / CJK titles). */
export function exportAsCSV(items: CollectionItem[]): void {
  const { headers, rows } = buildCollectionSheetRows(items);
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  // BOM helps Excel detect UTF-8
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `Collectors_Vault_List_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Excel-compatible spreadsheet (.xls SpreadsheetML).
 * Opens directly in Microsoft Excel / LibreOffice / Google Sheets (upload).
 */
export function exportAsExcel(items: CollectionItem[]): void {
  const { headers, rows } = buildCollectionSheetRows(items);

  const escapeXml = (value: string | number) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headerCells = headers
    .map(
      (h) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
    )
    .join('');

  const dataRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const isNum = typeof cell === 'number' && !Number.isNaN(cell);
          const type = isNum ? 'Number' : 'String';
          return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Collection">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  downloadBlob(
    blob,
    `Collectors_Vault_List_${new Date().toISOString().split('T')[0]}.xls`
  );
}
