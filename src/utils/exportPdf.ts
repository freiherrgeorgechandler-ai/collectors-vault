import { CollectionItem } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { resolveMediaUrl } from './apiBase';

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function artistOrMaker(item: CollectionItem): string {
  return (
    item.artistName ||
    item.makerArtist ||
    item.wineryProducer ||
    item.directorOrStudio ||
    item.factoryOrBrand ||
    '—'
  );
}

function formatOrType(item: CollectionItem): string {
  return (
    item.format ||
    item.teaType ||
    item.clayType ||
    item.wineType ||
    item.paintingMedium ||
    '—'
  );
}

function categoryLabel(category: string): string {
  return CATEGORY_MAP[category as keyof typeof CATEGORY_MAP]?.name || category;
}

function resolveImageSrc(src: string | undefined): string {
  return resolveMediaUrl(src);
}

/** Shrink huge data-URL photos so the print/PDF window stays responsive. */
async function shrinkDataUrlIfNeeded(src: string, maxSide = 480): Promise<string> {
  if (!src.startsWith('data:image/') || src.length < 200_000) return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

function formatPrice(item: CollectionItem): string {
  if (item.price === null || item.price === undefined) return 'Unpriced';
  return `${item.currency || 'USD'} ${Number(item.price).toLocaleString()}`;
}

/**
 * Opens a print-ready catalog with item images.
 * In the print dialog choose "Save as PDF" / "Microsoft Print to PDF".
 */
export async function exportAsPDF(items: CollectionItem[]): Promise<void> {
  if (!items.length) {
    window.alert('There are no items to export.');
    return;
  }

  const prepared = await Promise.all(
    items.map(async (item) => {
      const raw = resolveImageSrc(item.frontImage);
      const imageSrc = raw ? await shrinkDataUrlIfNeeded(raw) : '';
      return { item, imageSrc };
    })
  );

  const dateStr = new Date().toLocaleString();
  const cards = prepared
    .map(({ item, imageSrc }, idx) => {
      const imgBlock = imageSrc
        ? `<img class="cover" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.title)}" />`
        : `<div class="cover cover-empty">No image</div>`;

      return `
      <article class="card">
        <div class="thumb">${imgBlock}</div>
        <div class="meta">
          <div class="row-top">
            <span class="no">#${idx + 1}</span>
            <span class="cat">${escapeHtml(categoryLabel(item.category))}</span>
          </div>
          <h2>${escapeHtml(item.title || 'Untitled')}</h2>
          <p class="artist">${escapeHtml(artistOrMaker(item))}</p>
          <dl>
            <div><dt>Format</dt><dd>${escapeHtml(formatOrType(item))}</dd></div>
            <div><dt>Year</dt><dd>${escapeHtml(item.year ?? '—')}</dd></div>
            <div><dt>Country</dt><dd>${escapeHtml(item.country || '—')}</dd></div>
            <div><dt>Condition</dt><dd>${escapeHtml(item.condition || '—')}</dd></div>
            <div><dt>Price</dt><dd>${escapeHtml(formatPrice(item))}</dd></div>
            <div><dt>Storage</dt><dd>${escapeHtml(item.storageLocation || '—')}</dd></div>
            <div><dt>Purchased</dt><dd>${escapeHtml(item.purchasedDate || '—')}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(item.purchasedSource || '—')}</dd></div>
            <div><dt>Rating</dt><dd>${escapeHtml(item.rating ?? '—')} / 5</dd></div>
          </dl>
          ${
            item.notes
              ? `<p class="notes"><strong>Notes:</strong> ${escapeHtml(item.notes)}</p>`
              : ''
          }
        </div>
      </article>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Collector's Vault — Collection Catalog</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, sans-serif;
      color: #18181b;
      background: #fff;
      font-size: 11px;
      line-height: 1.35;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #18181b;
      color: #fafafa;
    }
    .toolbar p { margin: 0; font-size: 12px; opacity: 0.9; }
    .toolbar button {
      border: 0;
      border-radius: 8px;
      padding: 8px 14px;
      font-weight: 700;
      cursor: pointer;
      background: #f59e0b;
      color: #18181b;
    }
    header.report {
      padding: 18px 8px 10px;
      border-bottom: 2px solid #18181b;
      margin-bottom: 14px;
    }
    header.report h1 { margin: 0 0 4px; font-size: 20px; }
    header.report p { margin: 0; color: #52525b; }
    .grid { display: flex; flex-direction: column; gap: 12px; }
    .card {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 12px;
      border: 1px solid #d4d4d8;
      border-radius: 10px;
      padding: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .thumb { width: 120px; }
    .cover {
      width: 120px;
      height: 120px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e4e4e7;
      background: #f4f4f5;
    }
    .cover-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a1a1aa;
      font-size: 10px;
    }
    .row-top { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
    .no { font-weight: 700; color: #71717a; }
    .cat {
      background: #fef3c7;
      color: #92400e;
      border-radius: 999px;
      padding: 2px 8px;
      font-weight: 700;
      font-size: 10px;
    }
    h2 { margin: 0 0 2px; font-size: 14px; }
    .artist { margin: 0 0 8px; color: #52525b; font-size: 12px; }
    dl {
      margin: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    dl > div { display: grid; grid-template-columns: 72px 1fr; gap: 4px; }
    dt { color: #71717a; font-weight: 600; }
    dd { margin: 0; }
    .notes { margin: 8px 0 0; color: #3f3f46; }
    @media print {
      .toolbar { display: none !important; }
      body { font-size: 10px; }
      .card { border-color: #a1a1aa; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <p>Choose <strong>Save as PDF</strong> in the print dialog (destination / printer).</p>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <header class="report">
    <h1>Collector's Vault — Collection Catalog</h1>
    <p>${escapeHtml(items.length)} item(s) · Exported ${escapeHtml(dateStr)}</p>
  </header>
  <div class="grid">
    ${cards}
  </div>
  <script>
    (function () {
      function whenReady(cb) {
        var imgs = Array.prototype.slice.call(document.images || []);
        if (!imgs.length) { cb(); return; }
        var left = imgs.length;
        imgs.forEach(function (img) {
          if (img.complete) {
            if (--left === 0) cb();
          } else {
            img.onload = img.onerror = function () {
              if (--left === 0) cb();
            };
          }
        });
      }
      whenReady(function () {
        setTimeout(function () { window.focus(); window.print(); }, 250);
      });
    })();
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    window.alert(
      'Pop-up blocked. Please allow pop-ups for this site, then try Export PDF again.'
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
