'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  parseItemsCell,
  parseNumber,
  splitImageUrls,
  PUJA_CHIP_LABELS,
  type ChipOption,
  type ParsedPuja,
  type ParsedPujaItem,
  type PujaImportSummary,
} from '@/lib/puja-import-types';

interface ItemEditRow {
  rowId: string;
  originalName: string;
  name: string;
  price: string;
  purchase: string;
  description: string;
  images: string;
  chip: string;
  isActive: boolean;
  existing: boolean;
  warnings: string[];
}

interface PujaEditRow {
  rowId: string;
  originalName: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  itemsText: string;
  existing: boolean;
  warnings: string[];
}

interface PreviewSheetItem {
  rowId: string;
  existing?: boolean;
  name: string;
  price?: number;
  purchasePrice?: number;
  description?: string;
  imageUrls?: string[];
  chip?: string;
  isActive?: boolean;
  warnings?: string[];
}

interface PreviewSheetPuja {
  rowId: string;
  existing?: boolean;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  entries?: Array<{ name: string; qty: number }>;
  warnings?: string[];
}

interface PreviewResponse {
  ok: boolean;
  fileName?: string;
  warnings?: string[];
  chipOptions?: ChipOption[];
  sheets?: Array<{ kind: string; rows: Array<PreviewSheetItem | PreviewSheetPuja> }>;
  error?: string;
}

interface PujaImportDialogProps {
  onImported?: () => void;
  label?: string;
  title?: string;
  className?: string;
}

const STEPS = [
  { n: 1, label: 'Download & Upload' },
  { n: 2, label: 'Review & Edit' },
  { n: 3, label: 'Import Result' },
];

function entriesToText(entries: Array<{ name: string; qty: number }> | undefined): string {
  if (!entries) return '';
  return entries
    .map((e) => (e.qty > 1 ? `${e.qty} x ${e.name}` : e.name))
    .join(', ');
}

export function PujaImportDialog({ onImported, label = 'Upload Excel', title, className }: PujaImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0 upload, 1 review, 2 result
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chipOptions, setChipOptions] = useState<ChipOption[]>([]);
  const [items, setItems] = useState<ItemEditRow[]>([]);
  const [pujas, setPujas] = useState<PujaEditRow[]>([]);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [topWarnings, setTopWarnings] = useState<string[]>([]);
  const [reviewTab, setReviewTab] = useState<'items' | 'pujas'>('items');
  const [summary, setSummary] = useState<PujaImportSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [downloadingDemo, setDownloadingDemo] = useState(false);

  function reset() {
    setStep(0);
    setBusy(false);
    setUploadError(null);
    setFileName(null);
    setItems([]);
    setPujas([]);
    setDeleted(new Set());
    setTopWarnings([]);
    setReviewTab('items');
    setSummary(null);
    setSubmitting(false);
    setSubmitError(null);
  }

  async function downloadDemo() {
    setDownloadingDemo(true);
    try {
      const res = await fetch('/api/admin/export/pujas?template=1');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'puja-import-demo.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Demo Excel downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingDemo(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/import/puja/preview', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => null)) as PreviewResponse | null;
      if (!res.ok || !data?.ok) {
        setUploadError(data?.error ?? 'Could not read the file. Please check it and try again.');
        return;
      }

      const itemRows: ItemEditRow[] = [];
      const pujaRows: PujaEditRow[] = [];
      for (const sheet of data.sheets ?? []) {
        for (const row of sheet.rows) {
          if (sheet.kind === 'items') {
            const r = row as PreviewSheetItem;
            itemRows.push({
              rowId: r.rowId,
              originalName: r.name,
              name: r.name,
              price: r.price === undefined || r.price === null ? '' : String(r.price),
              purchase: r.purchasePrice === undefined || r.purchasePrice === null ? '' : String(r.purchasePrice),
              description: r.description ?? '',
              images: (r.imageUrls ?? []).join(', '),
              chip: r.chip ?? '',
              isActive: r.isActive ?? true,
              existing: !!r.existing,
              warnings: r.warnings ?? [],
            });
          } else {
            const r = row as PreviewSheetPuja;
            pujaRows.push({
              rowId: r.rowId,
              originalName: r.name,
              name: r.name,
              description: r.description ?? '',
              imageUrl: r.imageUrl ?? '',
              isActive: r.isActive ?? true,
              itemsText: entriesToText(r.entries),
              existing: !!r.existing,
              warnings: r.warnings ?? [],
            });
          }
        }
      }

      setFileName(data.fileName ?? file.name);
      setChipOptions(data.chipOptions ?? PUJA_CHIP_LABELS.map(([slug, label]) => ({ slug, label })));
      setItems(itemRows);
      setPujas(pujaRows);
      setTopWarnings(data.warnings ?? []);
      setReviewTab(itemRows.length > 0 ? 'items' : 'pujas');
      setStep(1);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const totalRows = items.length + pujas.length;
  const visibleItems = items.filter((r) => !deleted.has(r.rowId));
  const visiblePujas = pujas.filter((r) => !deleted.has(r.rowId));

  function updateItem(rowId: string, patch: Partial<ItemEditRow>) {
    setItems((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }
  function updatePuja(rowId: string, patch: Partial<PujaEditRow>) {
    setPujas((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }
  function removeRow(rowId: string) {
    setDeleted((prev) => new Set(prev).add(rowId));
  }

  async function submitImport() {
    // Build rows and validate names/prices.
    const problems: string[] = [];
    const itemRows: ParsedPujaItem[] = [];
    for (const r of visibleItems) {
      if (!r.name.trim()) problems.push(`Item row "${r.originalName}" is missing a name.`);
      const priceNum = r.price.trim() === '' ? undefined : parseNumber(r.price);
      if (r.price.trim() !== '' && priceNum === undefined) {
        problems.push(`Item "${r.name.trim() || r.originalName}": price "${r.price}" is not a valid number.`);
      }
      itemRows.push({
        name: r.name.trim(),
        price: priceNum,
        purchasePrice: r.purchase.trim() === '' ? undefined : parseNumber(r.purchase),
        description: r.description.trim() || undefined,
        imageUrls: splitImageUrls(r.images),
        chip: r.chip || undefined,
        isActive: r.isActive,
        warnings: [],
      });
    }
    const pujaRows: ParsedPuja[] = [];
    for (const r of visiblePujas) {
      if (!r.name.trim()) problems.push(`Puja row "${r.originalName}" is missing a name.`);
      pujaRows.push({
        name: r.name.trim(),
        description: r.description.trim() || undefined,
        imageUrl: r.imageUrl.trim() || undefined,
        isActive: r.isActive,
        entries: parseItemsCell(r.itemsText),
        warnings: [],
      });
    }
    if (problems.length > 0) {
      setSubmitError(problems[0]);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/admin/import/puja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemRows, pujas: pujaRows }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setSubmitError(data?.error ?? 'Import failed. Please try again.');
        return;
      }
      setSummary(data.summary as PujaImportSummary);
      setStep(2);
    } catch {
      setSubmitError('Import failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    onImported?.();
    setOpen(false);
    reset();
  }

  const itemCount = visibleItems.length;
  const pujaCount = visiblePujas.length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        title={title}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Upload className="mr-1 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Pujas &amp; Puja Items</DialogTitle>
            <DialogDescription>
              {step === 0 && 'Download the demo Excel, fill in your data without touching the header row, then upload it.'}
              {step === 1 && `Review the ${totalRows} row(s) read from ${fileName ?? 'your file'}. Edit or delete rows, then import.`}
              {step === 2 && 'Your import is complete.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => {
              const active = step === i;
              const done = step > i;
              return (
                <div key={s.n} className="flex flex-1 items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                        done
                          ? 'bg-success text-success-foreground'
                          : active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : s.n}
                    </span>
                    <span className={`hidden text-xs font-medium sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-px flex-1 ${step > i ? 'bg-success' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>

          {/* STEP 1 — download demo + upload */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                      <Download className="h-4 w-4 text-primary" /> Step 1 — Download the demo Excel
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      <li>
                        The workbook has two sheets: <span className="font-medium text-foreground">Puja Items</span> (item name,
                        price, category…) and <span className="font-medium text-foreground">Pujas</span> (puja name + its items).
                      </li>
                      <li>
                        Fill your data in the sample rows. <span className="font-medium text-foreground">Never change the header
                        row (row 1)</span> — the file is read by the header names.
                      </li>
                      <li>
                        In the Pujas sheet, list each puja&apos;s items in the Items column as comma-separated names (optional
                        quantity prefix, e.g. <span className="font-medium text-foreground">2 x Coconut</span>).
                      </li>
                      <li>Rows whose name already exists in the database will update it; new names will be added.</li>
                    </ul>
                    <Button type="button" variant="outline" size="sm" onClick={downloadDemo} disabled={downloadingDemo}>
                      {downloadingDemo ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-success" />}
                      {downloadingDemo ? 'Downloading…' : 'Download demo Excel (.xlsx)'}
                    </Button>
                  </div>
                </div>
              </div>

              <label
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition cursor-pointer hover:bg-muted/50 ${
                  uploadError ? 'border-destructive/60' : 'border-input'
                }`}
              >
                {busy ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {busy ? 'Reading file…' : 'Click to choose your .xlsx file'}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">.xlsx only · up to 15 MB</p>
                </div>
                {fileName && !busy && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
              {uploadError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — review & edit */}
          {step === 1 && (
            <div className="space-y-3">
              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              {topWarnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Notes from the file</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                      {topWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewTab('items')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    reviewTab === 'items' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Puja Items ({itemCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('pujas')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    reviewTab === 'pujas' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Pujas ({pujaCount})
                </button>
              </div>

              {reviewTab === 'items' && itemCount === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No puja items in this file (deleted rows are skipped).</p>
              )}
              {reviewTab === 'items' &&
                visibleItems.map((r) => {
                  const nameChanged = r.name.trim().toLowerCase() !== r.originalName.trim().toLowerCase();
                  return (
                    <div key={r.rowId} className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</span>
                          <Badge className={r.existing && !nameChanged ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-success/15 text-success'}>
                            {r.existing && !nameChanged ? 'Update existing' : 'Add new'}
                          </Badge>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.rowId)} aria-label={`Delete ${r.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="col-span-2 sm:col-span-1">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Item Name *</p>
                          <Input value={r.name} onChange={(e) => updateItem(r.rowId, { name: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Price (Rs)</p>
                          <Input type="number" min={0} value={r.price} onChange={(e) => updateItem(r.rowId, { price: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Purchase (Rs)</p>
                          <Input type="number" min={0} value={r.purchase} onChange={(e) => updateItem(r.rowId, { purchase: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Category</p>
                          <select
                            value={r.chip}
                            onChange={(e) => updateItem(r.rowId, { chip: e.target.value })}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="">Default</option>
                            {chipOptions.map((c) => (
                              <option key={c.slug} value={c.slug}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-4">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Description</p>
                          <Input value={r.description} onChange={(e) => updateItem(r.rowId, { description: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-2 sm:col-span-4">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Image URL(s) — comma separated</p>
                          <Input value={r.images} onChange={(e) => updateItem(r.rowId, { images: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <label className="col-span-2 flex items-center gap-2 sm:col-span-4">
                          <Checkbox checked={r.isActive} onCheckedChange={(v) => updateItem(r.rowId, { isActive: v === true })} />
                          <span className="text-xs text-muted-foreground">Active (visible in the store)</span>
                        </label>
                      </div>
                      {r.warnings.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.warnings.map((w, i) => (
                            <span key={i} className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {reviewTab === 'pujas' && pujaCount === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No pujas in this file (deleted rows are skipped).</p>
              )}
              {reviewTab === 'pujas' &&
                visiblePujas.map((r) => {
                  const nameChanged = r.name.trim().toLowerCase() !== r.originalName.trim().toLowerCase();
                  return (
                    <div key={r.rowId} className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Puja</span>
                          <Badge className={r.existing && !nameChanged ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-success/15 text-success'}>
                            {r.existing && !nameChanged ? 'Update existing' : 'Add new'}
                          </Badge>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.rowId)} aria-label={`Delete ${r.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="col-span-2 sm:col-span-1">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Puja Name *</p>
                          <Input value={r.name} onChange={(e) => updatePuja(r.rowId, { name: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Description</p>
                          <Input value={r.description} onChange={(e) => updatePuja(r.rowId, { description: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Image URL</p>
                          <Input value={r.imageUrl} onChange={(e) => updatePuja(r.rowId, { imageUrl: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Items (comma separated, e.g. 2 x Coconut)</p>
                          <Input value={r.itemsText} onChange={(e) => updatePuja(r.rowId, { itemsText: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <label className="col-span-2 flex items-center gap-2 sm:col-span-4">
                          <Checkbox checked={r.isActive} onCheckedChange={(v) => updatePuja(r.rowId, { isActive: v === true })} />
                          <span className="text-xs text-muted-foreground">Active (visible in the store)</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* STEP 3 — result */}
          {step === 2 && summary && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </span>
              <div>
                <p className="text-lg font-semibold text-foreground">Data imported successfully</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Existing names were updated, new names were added. The list has been refreshed.
                </p>
              </div>
              <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-2xl font-bold text-primary">{summary.itemsCreated}</p>
                  <p className="text-xs text-muted-foreground">Items added</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.itemsUpdated}</p>
                  <p className="text-xs text-muted-foreground">Items updated</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-2xl font-bold text-primary">{summary.pujasCreated}</p>
                  <p className="text-xs text-muted-foreground">Pujas added</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.pujasUpdated}</p>
                  <p className="text-xs text-muted-foreground">Pujas updated</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-2xl font-bold">{summary.linksCreated}</p>
                  <p className="text-xs text-muted-foreground">Item links synced</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-2xl font-bold">{summary.imagesAdded}</p>
                  <p className="text-xs text-muted-foreground">Images added</p>
                </div>
              </div>
              {summary.warnings.length > 0 && (
                <div className="w-full max-w-md rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> {summary.warnings.length} note(s)
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {summary.warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {summary.warnings.length > 5 && <li>…and {summary.warnings.length - 5} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === 0 && (
              <>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={!fileName || busy} onClick={() => setStep(1)}>
                  Next: Review {totalRows} row{totalRows === 1 ? '' : 's'} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
            {step === 1 && (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(0)} disabled={submitting}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  disabled={submitting || (itemCount === 0 && pujaCount === 0)}
                  onClick={submitImport}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Importing…
                    </>
                  ) : (
                    <>
                      Import {itemCount > 0 && `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                      {itemCount > 0 && pujaCount > 0 && ' · '}
                      {pujaCount > 0 && `${pujaCount} puja${pujaCount === 1 ? '' : 's'}`}
                    </>
                  )}
                </Button>
              </>
            )}
            {step === 2 && (
              <Button type="button" onClick={finish}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
