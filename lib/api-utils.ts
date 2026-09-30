import { NextResponse } from 'next/server';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCaseKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCaseKeys);

  if (typeof obj.toNumber === 'function') return obj.toNumber();

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[camelToSnake(key)] = toSnakeCaseKeys(obj[key]);
  }
  return result;
}

function toSnakeCamelKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCamelKeys);

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[snakeToCamel(key)] = toSnakeCamelKeys(obj[key]);
  }
  return result;
}

export function jsonResponse(data: any, init?: ResponseInit) {
  return NextResponse.json(toSnakeCaseKeys(data), init);
}

export async function parseBody(request: Request) {
  const body = await request.json();
  return toSnakeCamelKeys(body);
}

// Prisma DateTime fields reject date-only "YYYY-MM-DD" strings; normalize them
// to UTC midnight. Accepts Date, full ISO strings, and date-only strings.
// Returns null for null/empty (clears the value), undefined when the key is
// absent (leave untouched), and false for unparseable input (caller → 400).
export function normalizeOptionalDate(value: unknown): Date | null | undefined | false {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? false : value;
  const str = String(value).trim();
  if (!str) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00Z`) : new Date(str);
  return Number.isNaN(date.getTime()) ? false : date;
}
