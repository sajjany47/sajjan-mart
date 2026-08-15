import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ZCatalogue {
  catalogue: {
    catalogueId?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    imageUrlV2?: string;
    thumbUrl?: string;
    media?: { url?: string }[];
    nameSlug?: string;
    inStock?: boolean;
    isVisible?: boolean;
    servingSizeV2?: { servingInfoValue?: string; servingInfoUnit?: string };
    dishAttributes?: { attributes?: { attributeKey?: string; attributeValues?: string[] }[] }[];
  };
  variantWrappers?: {
    variantPrices?: { price?: number; basePrice?: number; maxAllowedPrice?: number }[];
  }[];
  catalogueTags?: string[];
}

interface ZMenu {
  menuResponse: {
    resId: string;
    categoryWrappers: {
      category: { name: string };
      subCategoryWrappers: { subCategoryEntities: { entityId?: string }[] }[];
    }[];
    catalogueWrappers: ZCatalogue[];
  };
}

const CATEGORY_PRIORITY = [
  'Pizza',
  'Momos',
  'Maggi',
  'Sandwiches',
  'Breakfast',
  'Snacks',
  'Dinner Special Menu',
  'All Time Favourite',
];

const CATEGORY_TO_SLUG: Record<string, string> = {
  Pizza: 'pizza',
  Momos: 'momos',
  Maggi: 'maggi',
  Sandwiches: 'sandwiches',
  Breakfast: 'breakfast',
  Snacks: 'snacks',
  'Dinner Special Menu': 'dinner_special_menu',
  'All Time Favourite': 'all_time_favourite',
};

const ADDON_LINK_RULES: { names: string[]; categories: string[] }[] = [
  { names: ['Extra Cheese', 'Extra Paneer'], categories: ['pizza', 'sandwiches', 'maggi'] },
  { names: ['Extra Chicken'], categories: ['pizza', 'sandwiches', 'maggi', 'snacks', 'dinner_special_menu'] },
  { names: ['Extra Corn', 'Extra Onion', 'Extra Tomato', 'Extra Capsicum'], categories: ['pizza', 'sandwiches', 'maggi', 'snacks'] },
  { names: ['Extra Boiled Egg', 'Extra Fried Egg'], categories: ['maggi', 'breakfast', 'snacks', 'sandwiches'] },
  { names: ['Extra Maggi Masala'], categories: ['maggi'] },
  { names: ['Extra Haldi', 'Extra Sugar', 'Extra Badam'], categories: ['dinner_special_menu', 'breakfast'] },
];

const CATEGORY_SORT_ORDER: Record<string, number> = {
  momos: 1,
  pizza: 2,
  maggi: 3,
  sandwiches: 10,
  breakfast: 11,
  snacks: 12,
  dinner_special_menu: 13,
};

const NON_ZOMATO_SORT_ORDER = 100;

function foodTypeFromTags(tags: string[] | undefined): string {
  const t = tags ?? [];
  if (t.includes('non-veg')) return 'non_veg';
  if (t.includes('veg')) return 'veg';
  if (t.includes('egg')) return 'egg';
  return 'veg';
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitle(name: string): string {
  const cleaned = name
    .replace(/\s*\[.*?\]\s*$/, '')
    .replace(/^.*?:/, '')
    .trim();
  if (cleaned) return cleaned;
  return slugify(name);
}

async function main() {
  console.log('Reading resturantMenu.json...');
  const raw = readFileSync(path.join(process.cwd(), 'resturantMenu.json'), 'utf8');
  const data = JSON.parse(raw) as ZMenu;
  const m = data.menuResponse;

  // entityId -> list of menu categories the dish belongs to
  const catMap = new Map<string, string[]>();
  for (const cw of m.categoryWrappers) {
    for (const sw of cw.subCategoryWrappers) {
      for (const e of sw.subCategoryEntities) {
        if (!e.entityId) continue;
        const list = catMap.get(e.entityId) ?? [];
        list.push(cw.category.name);
        catMap.set(e.entityId, list);
      }
    }
  }

  // Resolve primary productCategory using priority order (handles cross-category dishes)
  function pickCategory(id: string): string | null {
    const cats = catMap.get(id);
    if (!cats || cats.length === 0) return null;
    for (const p of CATEGORY_PRIORITY) {
      if (cats.includes(p) && CATEGORY_TO_SLUG[p]) return CATEGORY_TO_SLUG[p];
    }
    return CATEGORY_TO_SLUG[cats[0]] ?? null;
  }

  const foodCategory = await prisma.category.findUnique({ where: { slug: 'food' } });
  if (!foodCategory) throw new Error('Food category not found. Run npm run seed first.');

  let brand = await prisma.brand.findUnique({ where: { slug: 'sajjan-kitchen' } });
  if (!brand) {
    brand = await prisma.brand.create({ data: { name: 'Sajjan Kitchen', slug: 'sajjan-kitchen' } });
  }

  const existingSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));

  // Push any non-zomato food products (seed/misc) behind the menu so featured dishes lead
  await prisma.product.updateMany({
    where: {
      productType: 'food',
      NOT: { metadata: { path: ['source'], equals: 'zomato_menu' } },
    },
    data: { sortOrder: NON_ZOMATO_SORT_ORDER },
  });

  function uniqueSlug(base: string): string {
    let slug = base;
    let i = 1;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${i}`;
      i++;
    }
    existingSlugs.add(slug);
    return slug;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let imageCount = 0;

  const toppingCatalogues: ZCatalogue[] = [];

  for (const cw of m.catalogueWrappers) {
    const cat = cw.catalogue;
    const zomatoId = cat.catalogueId ?? '';
    const categorySlug = pickCategory(zomatoId);

    // Topping / add-on items: named, priced, but not a main menu dish
    const price = cw.variantWrappers?.[0]?.variantPrices?.[0]?.price;
    if (!categorySlug) {
      if (zomatoId && typeof price === 'number') toppingCatalogues.push(cw);
      else skipped++;
      continue;
    }

    const salesPrice = typeof price === 'number' ? price : 0;

    const baseSlug = cat.nameSlug || slugify(cat.name);
    // Find existing product by zomato id first (idempotent across re-runs)
    let existing = await prisma.product.findFirst({
      where: { metadata: { path: ['zomato_catalogue_id'], equals: zomatoId } },
    });
    const wasExisting = !!existing;
    const slug = existing ? existing.slug : uniqueSlug(baseSlug);
    if (existing && existing.slug !== baseSlug && !existingSlugs.has(baseSlug)) {
      // adopt a cleaner base slug if available
      existingSlugs.add(baseSlug);
    }

    const upserted = await prisma.product.upsert({
      where: { id: existing?.id ?? '__new__' },
      update: {
        name: cat.name,
        description: cat.description ?? null,
        productType: 'food',
        productCategory: categorySlug,
        sortOrder: CATEGORY_SORT_ORDER[categorySlug] ?? NON_ZOMATO_SORT_ORDER,
        brandId: brand.id,
        categoryId: foodCategory.id,
        salesPrice,
        purchasePrice: Math.round(salesPrice * 0.6),
        discountPercent: 0,
        quantityType: 'gram',
        quantity: cat.servingSizeV2 ? parseFloat(cat.servingSizeV2.servingInfoValue ?? '0') : 0,
        stockType: 'pack',
        stock: 0,
        foodType: foodTypeFromTags(cw.catalogueTags),
        isActive: cat.isVisible !== false && cat.inStock !== false,
        metadata: {
          zomato_catalogue_id: zomatoId,
          zomato_category: catMap.get(zomatoId)?.[0] ?? null,
          dish_attributes: cat.dishAttributes ?? [],
          tags: cw.catalogueTags ?? [],
          serving_size: cat.servingSizeV2 ?? null,
          source: 'zomato_menu',
        },
      },
      create: {
        name: cat.name,
        slug,
        description: cat.description ?? null,
        productType: 'food',
        productCategory: categorySlug,
        sortOrder: CATEGORY_SORT_ORDER[categorySlug] ?? NON_ZOMATO_SORT_ORDER,
        brandId: brand.id,
        categoryId: foodCategory.id,
        salesPrice,
        purchasePrice: Math.round(salesPrice * 0.6),
        quantityType: 'gram',
        quantity: cat.servingSizeV2 ? parseFloat(cat.servingSizeV2.servingInfoValue ?? '0') : 0,
        stockType: 'pack',
        stock: 0,
        foodType: foodTypeFromTags(cw.catalogueTags),
        isActive: cat.isVisible !== false && cat.inStock !== false,
        metadata: {
          zomato_catalogue_id: zomatoId,
          zomato_category: catMap.get(zomatoId)?.[0] ?? null,
          dish_attributes: cat.dishAttributes ?? [],
          tags: cw.catalogueTags ?? [],
          serving_size: cat.servingSizeV2 ?? null,
          source: 'zomato_menu',
        },
      },
    });

    const urls = Array.from(
      new Set(
        [
          cat.imageUrlV2,
          cat.imageUrl,
          ...(cat.media ?? []).map((x) => x.url).filter(Boolean),
          cat.thumbUrl,
        ].filter(Boolean) as string[]
      )
    );

    if (urls.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: upserted.id } });
      for (let i = 0; i < urls.length; i++) {
        await prisma.productImage.create({ data: { productId: upserted.id, url: urls[i], alt: toTitle(cat.name), sortOrder: i } });
        imageCount++;
      }
    }

    if (wasExisting) updated++;
    else created++;
  }

  console.log(`Imported dishes: created=${created} updated=${updated} skipped=${skipped}, images=${imageCount}`);

  // ---------- Add-on items from toppings ----------
  const addOnSeen = new Map<string, number>();
  const addOnRecords: { name: string; price: number }[] = [];
  for (const cw of toppingCatalogues) {
    const name = cw.catalogue.name;
    const price = cw.variantWrappers?.[0]?.variantPrices?.[0]?.price;
    if (typeof price !== 'number') continue;
    const mapped = `Extra ${toTitle(name)}`;
    if (addOnSeen.has(mapped)) {
      addOnSeen.set(mapped, Math.max(addOnSeen.get(mapped)!, price));
    } else {
      addOnSeen.set(mapped, price);
    }
  }
  for (const [name, price] of Array.from(addOnSeen)) addOnRecords.push({ name, price });
  addOnRecords.sort((a, b) => a.name.localeCompare(b.name));

  let addOnUpserts = 0;
  for (const a of addOnRecords) {
    const existingAddOn = await prisma.addOnItem.findFirst({ where: { name: a.name } });
    if (existingAddOn) {
      await prisma.addOnItem.update({ where: { id: existingAddOn.id }, data: { price: a.price, isActive: true } });
    } else {
      await prisma.addOnItem.create({ data: { name: a.name, price: a.price, isActive: true } });
    }
    addOnUpserts++;
  }
  console.log(`Imported ${addOnUpserts} add-on items`);

  // ---------- Link add-ons to matching categories ----------
  const allAddOns = await prisma.addOnItem.findMany({ where: { isActive: true } });
  const allProducts = await prisma.product.findMany({
    where: { productType: 'food', isActive: true },
    select: { id: true, productCategory: true },
  });

  let links = 0;
  if (allProducts.length > 0) {
    for (const rule of ADDON_LINK_RULES) {
      const addOnIds = allAddOns.filter((a) => rule.names.includes(a.name)).map((a) => a.id);
      if (addOnIds.length === 0) continue;
      const products = allProducts.filter((p) => p.productCategory && rule.categories.includes(p.productCategory));
      for (const product of products) {
        const records = addOnIds.map((addOnId) => ({ productId: product.id, addOnId }));
        await prisma.productAddOn.createMany({ data: records, skipDuplicates: true });
        links += records.length;
      }
    }
  }
  console.log(`Linked ${links} add-on assignments across food products`);

  console.log('Zomato menu import complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());