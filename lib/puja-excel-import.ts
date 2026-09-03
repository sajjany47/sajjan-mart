import ExcelJS from 'exceljs';
import {
  parseBool,
  parseItemsCell,
  parseNumber,
  resolveChip,
  splitImageUrls,
  type ParsedPuja,
  type ParsedPujaItem,
} from './puja-import-types';

/**
 * Server-only workbook parser for the admin "Upload Excel" puja import.
 *
 * Expected workbook (both sheets optional, names matched loosely):
 *   Sheet "Puja Items" — one row per puja samagri product:
 *     Item Name, Price (Rs), Purchase Price (Rs), Description,
 *     Image URL (comma-separated allowed), Category (chip label or slug), Is Active
 *   Sheet "Pujas" — one row per puja package:
 *     Puja Name, Description, Image URL, Is Active,
 *     Items (comma-separated item names, optional "2 x Coconut" quantity prefix)
 *
 * No database access here — returns normalized rows that the API applies.
 */

/** Lowercase + strip anything that is not a-z0-9 so header variants collapse. */
function normalizeHeader(header: unknown): string {
  const s = String(header ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // drop "(Rs)" etc.
    .replace(/[^a-z0-9]+/g, '');
  return s;
}

const NAME_HEADERS = ['name', 'itemname', 'productname', 'pujaname', 'puja', 'item'];
const PRICE_HEADERS = ['salesprice', 'price', 'rate', 'amount', 'mrp', 'sellingprice', 'saleprice'];
const PURCHASE_HEADERS = ['purchaseprice', 'purchase', 'costprice', 'buyingprice'];
const DESCRIPTION_HEADERS = ['description', 'desc', 'details', 'about'];
const IMAGE_HEADERS = ['imageurl', 'image', 'images', 'imageurls', 'photo', 'photourl', 'picture'];
const CATEGORY_HEADERS = ['category', 'chip', 'productcategory', 'categorychip', 'samagricategory'];
const ACTIVE_HEADERS = ['isactive', 'active', 'status', 'enabled', 'visible'];
const ITEMS_HEADERS = ['items', 'itemlist', 'itemnames', 'contents', 'includeditems', 'samagri', 'productnames'];

export interface PujaImportParseResult {
  items: ParsedPujaItem[];
  pujas: ParsedPuja[];
  warnings: string[];
  /** Human-readable problem statements; route returns 400 when non-empty. */
  errors: string[];
}

type SheetKind = 'items' | 'pujas';

function firstMatchingHeader(headers: string[], candidates: string[]): string | undefined {
  for (let i = 0; i < candidates.length; i++) {
    if (headers.includes(candidates[i])) return candidates[i];
  }
  return undefined;
}

function detectSheetKind(worksheet: ExcelJS.Worksheet, headers: string[]): SheetKind {
  const name = (worksheet.name ?? '').toLowerCase().trim();
  if (name.includes('item')) return 'items';
  if (name.includes('puja')) return 'pujas';

  // Fall back to header inspection when the sheet is renamed.
  if (firstMatchingHeader(headers, ITEMS_HEADERS)) return 'pujas';
  if (headers.includes('pujaname') || headers.includes('puja')) return 'pujas';
  return 'items';
}

export async function parsePujaWorkbook(buffer: Buffer | ArrayBuffer): Promise<PujaImportParseResult> {
  const result: PujaImportParseResult = { items: [], pujas: [], warnings: [], errors: [] };

  let workbook: ExcelJS.Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
  } catch {
    result.errors.push('Could not read the Excel file. Please upload a valid .xlsx workbook.');
    return result;
  }

  for (let s = 0; s < workbook.worksheets.length; s++) {
    const worksheet = workbook.worksheets[s];

    // Normalized header -> column number (1-based).
    const headerToCol: Record<string, number> = {};
    const headers: string[] = [];
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = normalizeHeader(cell.value);
      if (key && headerToCol[key] === undefined) {
        headerToCol[key] = colNumber;
        headers.push(key);
      }
    });

    const nameHeader = firstMatchingHeader(headers, NAME_HEADERS);
    if (!nameHeader) continue; // not a data sheet

    const kind = detectSheetKind(worksheet, headers);

    const rowValue = (r: number, candidates: string[]): unknown => {
      const header = firstMatchingHeader(headers, candidates);
      const col = header === undefined ? undefined : headerToCol[header];
      if (col === undefined) return undefined;
      return worksheet.getRow(r).getCell(col).value;
    };

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const name = String(rowValue(r, NAME_HEADERS) ?? '').trim();
      if (!name) continue;
      const rowWarnings: string[] = [];

      if (kind === 'items') {
        const price = parseNumber(rowValue(r, PRICE_HEADERS));
        const rawPrice = rowValue(r, PRICE_HEADERS);
        if (rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '' && price === undefined) {
          rowWarnings.push(`Row ${r}: price "${String(rawPrice)}" is not a valid number and was ignored`);
        }
        const chipResult = resolveChip(rowValue(r, CATEGORY_HEADERS));
        if (chipResult.note) rowWarnings.push(`Row ${r}: ${chipResult.note}`);
        const description = rowValue(r, DESCRIPTION_HEADERS);
        const trimmedDescription =
          description === undefined || description === null ? undefined : String(description).trim() || undefined;

        result.items.push({
          name,
          price,
          purchasePrice: parseNumber(rowValue(r, PURCHASE_HEADERS)),
          description: trimmedDescription,
          imageUrls: splitImageUrls(rowValue(r, IMAGE_HEADERS)),
          chip: chipResult.slug,
          isActive: parseBool(rowValue(r, ACTIVE_HEADERS)),
          warnings: rowWarnings,
        });
      } else {
        const imageUrls = splitImageUrls(rowValue(r, IMAGE_HEADERS));
        const description = rowValue(r, DESCRIPTION_HEADERS);
        const trimmedDescription =
          description === undefined || description === null ? undefined : String(description).trim() || undefined;

        result.pujas.push({
          name,
          description: trimmedDescription,
          imageUrl: imageUrls[0],
          isActive: parseBool(rowValue(r, ACTIVE_HEADERS)),
          entries: parseItemsCell(rowValue(r, ITEMS_HEADERS)),
          warnings: rowWarnings,
        });
      }
    }
  }

  if (result.items.length === 0 && result.pujas.length === 0) {
    result.errors.push(
      'No data found. Expected a workbook with a "Puja Items" sheet (Item Name, Price…) and/or a "Pujas" sheet (Puja Name, Items…).',
    );
  }

  return result;
}
