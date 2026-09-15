import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

async function checkUrl(url: string, timeoutMs: number = 8000) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'SajjanMart-HealthCheck/1.0' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    return {
      url,
      status: res.status,
      ok: res.ok,
      latencyMs,
      error: res.ok ? null : `HTTP Status ${res.status}`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;
    return {
      url,
      status: 0,
      ok: false,
      latencyMs,
      error: err.name === 'AbortError' ? 'Request Timeout (8s)' : (err.message || 'Fetch failed'),
    };
  }
}

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
      error: null,
    };
  } catch (err: any) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err.message || 'Database connection failed',
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Extract target URLs to check
  const url1Param = searchParams.get('url1');
  const url2Param = searchParams.get('url2');
  const urlsParam = searchParams.get('urls');

  let targetUrls: string[] = [];

  if (urlsParam) {
    targetUrls = urlsParam.split(',').map((u) => u.trim()).filter(Boolean);
  } else if (url1Param || url2Param) {
    if (url1Param) targetUrls.push(url1Param.trim());
    if (url2Param) targetUrls.push(url2Param.trim());
  } else {
    // Check environment variables or default to local endpoints
    const envUrl1 = process.env.HEALTH_CHECK_URL1 || process.env.HEALTH_CHECK_URL_1;
    const envUrl2 = process.env.HEALTH_CHECK_URL2 || process.env.HEALTH_CHECK_URL_2;

    if (envUrl1) targetUrls.push(envUrl1.trim());
    if (envUrl2) targetUrls.push(envUrl2.trim());

    // If still no external URLs provided, default to internal API endpoints
    if (targetUrls.length === 0) {
      targetUrls = [
        `${origin}/api/categories`,
        `${origin}/api/products?limit=1`,
      ];
    }
  }

  // Execute DB check and target URL checks concurrently
  const [dbResult, ...apiResults] = await Promise.all([
    checkDatabase(),
    ...targetUrls.map((url) => checkUrl(url)),
  ]);

  const allApisOk = apiResults.every((res) => res.ok);
  const dbOk = dbResult.status === 'ok';
  const overallHealthy = dbOk && allApisOk;

  const responseBody = {
    status: overallHealthy ? 'healthy' : allApisOk ? 'degraded_db' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbResult,
    apisCheckedCount: apiResults.length,
    apis: apiResults,
  };

  return NextResponse.json(responseBody, {
    status: overallHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

export async function HEAD(request: NextRequest) {
  return GET(request);
}
