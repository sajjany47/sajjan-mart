import { prisma } from '@/lib/prisma/client';
import { slugify } from '@/lib/format';
import {
  CATEGORY_SLUG_BY_TYPE,
  FOOD_TYPE_LABELS,
  type ParsedPujaItem,
  type ProductType,
  type PujaImportSummary,
} from './puja-import-types';

/**
 * Server-only apply step for the per-type product catalog import (food /
 * natural / general): products are upserted by name scoped to the product type
 * (name found -> update; not found -> insert).
 */

interface ProductRef {
  id: string;
  name: string;
  slug: string;
  salesPrice: number;
  images: string[];
}

function uniqueSlug(base: string, used: Set<string>): string {
  const clean = base || 'item';
  if (!used.has(clean)) {
    used.add(clean);
    return clean;
  }
  let i = 2;
  while (used.has(`${clean}-${i}`)) i++;
  used.add(`${clean}-${i}`);
  return `${clean}-${i}`;
}

const FOOD_TYPE_SLUGS = new Set(FOOD_TYPE_LABELS.map(([slug]) => slug));

export async function applyProductImport(
  items: ParsedPujaItem[],
  productType: ProductType,
): Promise<PujaImportSummary> {
  const categorySlug = CATEGORY_SLUG_BY_TYPE[productType];
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    throw new Error(`Category "${categorySlug}" was not found. Please run the database seed first.`);
  }

  const isFood = productType === 'food';

  const subCategories = await prisma.subCategory.findMany({
    where: { categoryId: category.id },
    select: { id: true, slug: true },
  });
  const subCategoryBySlug = new Map(subCategories.map((s) => [s.slug, s.id]));

  const [existingProducts, allSlugs] = await Promise.all([
    prisma.product.findMany({
      where: { productType },
      select: { id: true, name: true, slug: true, salesPrice: true, productImages: { select: { url: true } } },
    }),
    prisma.product.findMany({ select: { slug: true } }),
  ]);

  const productByName = new Map<string, ProductRef>();
  for (const p of existingProducts) {
    productByName.set(p.name.trim().toLowerCase(), {
      id: p.id,
      name: p.name,
      slug: p.slug,
      salesPrice: Number(p.salesPrice),
      images: p.productImages.map((img) => img.url),
    });
  }
  const usedProductSlugs = new Set(allSlugs.map((p) => p.slug));

  const summary: PujaImportSummary = {
    itemRows: items.length,
    itemsCreated: 0,
    itemsUpdated: 0,
    imagesAdded: 0,
    pujaRows: 0,
    pujasCreated: 0,
    pujasUpdated: 0,
    linksCreated: 0,
    warnings: [],
  };

  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const existing = productByName.get(key);
    const chip = item.chip ?? 'other';
    if (item.warnings) summary.warnings.push(...item.warnings);

    let foodType: string | undefined;
    if (isFood) {
      if (item.foodType !== undefined) {
        if (FOOD_TYPE_SLUGS.has(item.foodType)) {
          foodType = item.foodType;
        } else {
          summary.warnings.push(`Item "${item.name}": food type "${item.foodType}" is invalid and was ignored.`);
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (item.price !== undefined) data.salesPrice = item.price;
    if (item.purchasePrice !== undefined) data.purchasePrice = item.purchasePrice;
    if (item.description) data.description = item.description;
    if (item.chip) {
      data.productCategory = chip;
      data.subCategoryId = subCategoryBySlug.get(chip) ?? null;
    }
    if (item.isActive !== undefined) data.isActive = item.isActive;
    if (foodType !== undefined) data.foodType = foodType;

    if (existing) {
      if (Object.keys(data).length > 0) {
        await prisma.product.update({ where: { id: existing.id }, data });
      }
      summary.itemsUpdated++;
      let sortOrder = existing.images.length;
      for (const url of item.imageUrls) {
        if (!existing.images.includes(url)) {
          await prisma.productImage.create({
            data: { productId: existing.id, url, alt: item.name, sortOrder: sortOrder++ },
          });
          existing.images.push(url);
          summary.imagesAdded++;
        }
      }
      if (item.price !== undefined) existing.salesPrice = item.price;
      existing.name = item.name;
      productByName.set(key, existing);
      continue;
    }

    // New product.
    const baseSlug = slugify(item.name);
    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: uniqueSlug(baseSlug, usedProductSlugs),
        description: item.description || `${item.name}.`,
        productType,
        categoryId: category.id,
        subCategoryId: subCategoryBySlug.get(chip) ?? null,
        brandId: null,
        purchasePrice: item.purchasePrice ?? (item.price !== undefined ? Math.round(item.price * 0.6 * 100) / 100 : 0),
        salesPrice: item.price ?? 0,
        discountPercent: 0,
        quantityType: 'piece',
        quantity: 1,
        stockType: isFood ? null : 'piece',
        stock: isFood ? 0 : 100,
        foodType: isFood ? foodType ?? 'veg' : null,
        productCategory: chip,
        isActive: item.isActive ?? true,
        isFeatured: false,
        metadata: { source: 'admin_excel_import' },
      },
    });
    let sortOrder = 0;
    for (const url of item.imageUrls) {
      await prisma.productImage.create({
        data: { productId: product.id, url, alt: item.name, sortOrder: sortOrder++ },
      });
      summary.imagesAdded++;
    }
    productByName.set(key, {
      id: product.id,
      name: item.name,
      slug: product.slug,
      salesPrice: item.price ?? 0,
      images: [...item.imageUrls],
    });
    summary.itemsCreated++;
  }

  return summary;
}