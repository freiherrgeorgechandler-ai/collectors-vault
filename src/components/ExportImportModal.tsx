import React, { useEffect, useMemo, useState } from 'react';
import { CollectionItem } from '../types';
import { exportAsJSON, exportAsCSV, exportAsExcel } from '../utils/storage';
import { exportAsPDF } from '../utils/exportPdf';
import { CATEGORY_MAP } from '../data/categories';
import {
  X,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Table2,
  FileImage,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CollectionItem[];
  onImportItems: (imported: CollectionItem[]) => void;
}

function itemSubtitle(item: CollectionItem): string {
  return (
    item.artistName ||
    item.makerArtist ||
    item.wineryProducer ||
    item.directorOrStudio ||
    item.factoryOrBrand ||
    CATEGORY_MAP[item.category]?.name ||
    item.category
  );
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  items,
  onImportItems,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfSearch, setPdfSearch] = useState('');

  // Reset picker each time the modal opens (start with nothing selected for privacy)
  useEffect(() => {
    if (!isOpen) return;
    setShowPdfPicker(false);
    setSelectedIds(new Set());
    setPdfSearch('');
    setErrorMsg(null);
    setImportStatus(null);
    setPdfBusy(false);
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = pdfSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [
        item.title,
        itemSubtitle(item),
        item.category,
        item.storageLocation,
        item.notes,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, pdfSearch]);

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));

  if (!isOpen) return null;

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const selectAllItems = () => setSelectedIds(new Set(items.map((i) => i.id)));

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportItems(parsed);
          setImportStatus(`Successfully restored ${parsed.length} collection items!`);
        } else {
          setErrorMsg('Invalid backup file. Must be a valid JSON array of collection items.');
        }
      } catch (err) {
        setErrorMsg('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportPdf = async () => {
    setErrorMsg(null);
    if (selectedCount === 0) {
      setErrorMsg('Select at least one item for the PDF catalog.');
      return;
    }
    const chosen = items.filter((i) => selectedIds.has(i.id));
    setPdfBusy(true);
    try {
      await exportAsPDF(chosen);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to prepare PDF export.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80 sticky top-0 z-10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <span>{showPdfPicker ? 'Select Items for PDF' : 'Export / Import'}</span>
          </h2>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!showPdfPicker ? (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Export Collection ({items.length} records)
                </h3>

                <button
                  onClick={() => {
                    setErrorMsg(null);
                    setSelectedIds(new Set(items.map((i) => i.id)));
                    setShowPdfPicker(true);
                  }}
                  disabled={items.length === 0}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/20 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileImage className="w-9 h-9 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block text-sm font-bold text-rose-200">Export PDF Catalog</span>
                    <span className="block text-[11px] text-zinc-400 mt-0.5">
                      All items selected — untick any you want to leave out, then save as PDF
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => exportAsExcel(items)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-500/20 transition-all text-left group"
                >
                  <Table2 className="w-9 h-9 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block text-sm font-bold text-emerald-200">Export Excel Sheet</span>
                    <span className="block text-[11px] text-zinc-400 mt-0.5">
                      Full collection list — opens in Excel
                    </span>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => exportAsCSV(items)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/40 transition-all text-center group"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-zinc-200">Export CSV</span>
                    <span className="text-[10px] text-zinc-500">Spreadsheet (UTF-8)</span>
                  </button>

                  <button
                    onClick={() => exportAsJSON(items)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800/40 transition-all text-center group"
                  >
                    <FileText className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-zinc-200">Export JSON</span>
                    <span className="text-[10px] text-zinc-500">Full Data Backup</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 border-t border-zinc-800 pt-5">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Restore / Import Backup
                </h3>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-950/60 hover:border-amber-500/50 hover:bg-zinc-950 transition-all cursor-pointer">
                  <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                  <span className="text-xs font-semibold text-zinc-300">Choose JSON Backup File</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Click to select backup .json file</span>
                  <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-400">
                Everything starts selected. Untick items you do not want in the PDF.
              </p>

              <input
                type="search"
                value={pdfSearch}
                onChange={(e) => setPdfSearch(e.target.value)}
                placeholder="Search title, artist, category…"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  {selectedCount} selected
                  {pdfSearch.trim() ? ` · showing ${filteredItems.length}` : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={allFilteredSelected ? () => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        filteredItems.forEach((i) => next.delete(i.id));
                        return next;
                      });
                    } : selectAllFiltered}
                    className="text-[11px] font-semibold text-rose-300 hover:text-rose-200"
                  >
                    {allFilteredSelected ? 'Deselect shown' : 'Select shown'}
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={selectAllItems}
                    className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
                  >
                    Select all
                  </button>
                </div>
              </div>

              <div className="max-h-[42vh] overflow-y-auto rounded-2xl border border-zinc-800 divide-y divide-zinc-800/80 bg-zinc-950/50">
                {filteredItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">No items match your search.</div>
                ) : (
                  filteredItems.map((item) => {
                    const checked = selectedIds.has(item.id);
                    const cat = CATEGORY_MAP[item.category]?.name || item.category;
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-900/80 ${
                          checked ? 'bg-rose-500/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleId(item.id)}
                          className="sr-only"
                        />
                        {checked ? (
                          <CheckSquare className="w-4.5 h-4.5 w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        {item.frontImage ? (
                          <img
                            src={item.frontImage}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border border-zinc-800 shrink-0 bg-zinc-900"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-zinc-100 truncate">{item.title}</div>
                          <div className="text-[10px] text-zinc-500 truncate">
                            {cat} · {itemSubtitle(item)}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPdfPicker(false);
                    setErrorMsg(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={pdfBusy || selectedCount === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-zinc-950 text-xs font-bold hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pdfBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing…
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4" />
                      Create PDF ({selectedCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {importStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {!showPdfPicker && (
          <div className="flex items-center justify-end border-t border-zinc-800 px-6 py-4 bg-zinc-950/80">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
