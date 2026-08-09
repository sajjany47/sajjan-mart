import { prisma } from '@/lib/prisma/client';

type PrismaModel = {
  findMany: (args: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
};

const modelMap: Record<string, PrismaModel> = {
  banners: prisma.banner as any,
  categories: prisma.category as any,
  products: prisma.product as any,
  pujas: prisma.puja as any,
  pandits: prisma.pandit as any,
  puja_items: prisma.pujaItem as any,
  product_images: prisma.productImage as any,
  product_variants: prisma.productVariant as any,
  add_on_items: prisma.addOnItem as any,
  product_add_ons: prisma.productAddOn as any,
  profiles: prisma.profile as any,
  orders: prisma.order as any,
  order_items: prisma.orderItem as any,
  addresses: prisma.address as any,
  wishlist: prisma.wishlist as any,
  reviews: prisma.review as any,
  coupons: prisma.coupon as any,
  brands: prisma.brand as any,
  sub_categories: prisma.subCategory as any,
  support_tickets: prisma.supportTicket as any,
  puja_pandits: prisma.pujaPandit as any,
  settings: prisma.storeConfig as any,
};

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertKeys(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = v;
  }
  return out;
}

function toSnakeCaseKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCaseKeys);
  if (typeof obj.toNumber === 'function') return obj.toNumber();

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = toSnakeCaseKeys(v);
  }
  return out;
}

const RELATION_INCLUDES: Record<string, Record<string, string>> = {
  products: {
    product_images: 'productImages',
    product_variants: 'variants',
    category: 'category',
    sub_category: 'subCategory',
    brand: 'brand',
    product_add_ons: 'addOnLinks',
  },
  add_on_items: {
    products: 'products',
  },
  reviews: {
    profiles: 'user',
    product: 'product',
  },
  orders: {
    order_items: 'items',
  },
  pujas: {
    items: 'items',
  },
  wishlist: {
    products: 'product',
  },
  essentials: {
    essential_images: 'essentialImages',
  },
  puja_items: {
    product: 'product',
  },
  support_tickets: {
    user: 'user',
    order: 'order',
  },
};

function buildInclude(table: string, query?: string): Record<string, any> | undefined {
  if (!query) return undefined;
  const map = RELATION_INCLUDES[table];
  if (!map) return undefined;

  const include: Record<string, any> = {};
  const re = /([a-z_]+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query))) {
    const rel = m[1];
    const prismaField = map[rel];
    if (prismaField) include[prismaField] = true;
  }
  if (include.addOnLinks) {
    include.addOnLinks = { include: { addOn: true } };
  }
  return Object.keys(include).length ? include : undefined;
}

function makeQueryBuilder(model: PrismaModel, table: string) {
  const filters: Record<string, any> = {};
  let selectQuery: string | null = null;
  let orderByField: string | null = null;
  let orderDir: 'asc' | 'desc' = 'asc';
  let takeVal: number | null = null;
  let skipVal: number | null = null;

  const builder: any = {
    select(query?: string) {
      selectQuery = query ?? '*';
      return builder;
    },
    eq(field: string, value: any) {
      filters[field] = value;
      return builder;
    },
    neq(field: string, value: any) {
      filters[field] = { ...filters[field], not: value };
      return builder;
    },
    in(field: string, values: any[]) {
      filters[field] = { in: values };
      return builder;
    },
    ilike(field: string, pattern: string) {
      filters[field] = { contains: pattern.replace(/%/g, ''), mode: 'insensitive' };
      return builder;
    },
    gte(field: string, value: number) {
      filters[field] = { ...filters[field], gte: value };
      return builder;
    },
    lte(field: string, value: number) {
      filters[field] = { ...filters[field], lte: value };
      return builder;
    },
    order(field: string, opts?: { ascending?: boolean }) {
      orderByField = toCamel(field);
      orderDir = opts?.ascending === false ? 'desc' : 'asc';
      return builder;
    },
    limit(n: number) {
      takeVal = n;
      return builder;
    },
    range(start: number, end: number) {
      skipVal = start;
      takeVal = end - start + 1;
      return builder;
    },
    single() {
      return builder.maybeSingle();
    },
    async maybeSingle() {
      const where = convertKeys(filters);
      const include = buildInclude(table, selectQuery ?? undefined);
      const args: any = { where };
      if (include) args.include = include;
      const result = await model.findFirst(args);
      return { data: result ? toSnakeCaseKeys(result) : null, error: null };
    },
    async then(resolve: any) {
      const where = convertKeys(filters);
      const include = buildInclude(table, selectQuery ?? undefined);
      const args: any = { where };
      if (include) args.include = include;
      if (orderByField) args.orderBy = { [orderByField]: orderDir };
      if (takeVal) args.take = takeVal;
      if (skipVal) args.skip = skipVal;
      const result = await model.findMany(args);
      const converted = result.map(toSnakeCaseKeys);
      return resolve({ data: converted, count: converted.length, error: null });
    },
  };

  return builder;
}

export function createServerSupabase() {
  return {
    from(table: string) {
      const model = modelMap[table];
      if (!model) throw new Error(`Unknown table: ${table}`);
      return makeQueryBuilder(model, table);
    },
  };
}
