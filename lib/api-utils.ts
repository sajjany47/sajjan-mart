import { NextResponse } from 'next/server';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
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

export function jsonResponse(data: any, init?: ResponseInit) {
  return NextResponse.json(toSnakeCaseKeys(data), init);
}
