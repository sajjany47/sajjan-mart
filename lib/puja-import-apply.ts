import { prisma } from '@/lib/prisma/client';
import { slugify } from '@/lib/format';
import type { ParsedPuja, ParsedPujaItem, PujaImportSummary } from './puja-import-types';

/**
 * Server-only apply step: upserts puja samagri products and puja packages by
 * name (name found -> update; not found -> insert), relinks each puja's items
 * from the provided entries and recomputes base_price.
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

export async function applyPujaImport(
  items: ParsedPujaItem[],
  pujas: ParsedPuja[],
): Promise<PujaImportSummary> {
  const pujaCategory = await prisma.category.findUnique({ where: { slug: 'puja-samagri' } });
  if (!pujaCategory) {
    throw new Error('Puja Samagri category was not found. Please run the database seed first.');
  }

  const subCategories = await prisma.subCategory.findMany({
    where: { categoryId: pujaCategory.id },
    select: { id: true, slug: true },
  });
  const subCategoryBySlug = new Map(subCategories.map((s) => [s.slug, s.id]));

  const [existingProducts, existingPujas] = await Promise.all([
    prisma.product.findMany({
      where: { productType: 'puja_samagri' },
      select: { id: true, name: true, slug: true, salesPrice: true, productImages: { select: { url: true } } },
    }),
    prisma.puja.findMany({ select: { id: true, name: true, slug: true } }),
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
  const usedProductSlugs = new Set(existingProducts.map((p) => p.slug));
  const usedPujaSlugs = new Set(existingPujas.map((p) => p.slug));
  const pujaByName = new Map(existingPujas.map((p) => [p.name.trim().toLowerCase(), p]));

  const summary: PujaImportSummary = {
    itemRows: items.length,
    itemsCreated: 0,
    itemsUpdated: 0,
    imagesAdded: 0,
    pujaRows: pujas.length,
    pujasCreated: 0,
    pujasUpdated: 0,
    linksCreated: 0,
    warnings: [],
  };

  const upsertItem = async (item: ParsedPujaItem): Promise<ProductRef> => {
    const key = item.name.trim().toLowerCase();
    const existing = productByName.get(key);
    const chip = item.chip ?? 'other';
    if (item.warnings) summary.warnings.push(...item.warnings);

    const data: Record<string, unknown> = {};
    if (item.price !== undefined) data.salesPrice = item.price;
    if (item.purchasePrice !== undefined) data.purchasePrice = item.purchasePrice;
    if (item.description) data.description = item.description;
    if (item.chip) {
      data.productCategory = chip;
      data.subCategoryId = subCategoryBySlug.get(chip) ?? null;
    }
    if (item.isActive !== undefined) data.isActive = item.isActive;

    if (existing) {
      if (Object.keys(data).length > 0) {
        await prisma.product.update({ where: { id: existing.id }, data });
      }
      summary.itemsUpdated++;
      // Add any missing image URLs.
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
      return existing;
    }

    // New puja samagri product.
    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: uniqueSlug(`puja-${slugify(item.name)}`, usedProductSlugs),
        description: item.description || `${item.name} — puja samagri item.`,
        productType: 'puja_samagri',
        categoryId: pujaCategory.id,
        subCategoryId: subCategoryBySlug.get(chip) ?? null,
        brandId: null,
        purchasePrice: item.purchasePrice ?? (item.price !== undefined ? Math.round(item.price * 0.6 * 100) / 100 : 0),
        salesPrice: item.price ?? 0,
        discountPercent: 0,
        quantityType: 'piece',
        quantity: 1,
        stockType: 'piece',
        stock: 100,
        productCategory: chip,
        isActive: item.isActive ?? true,
        isFeatured: true,
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
    const ref: ProductRef = {
      id: product.id,
      name: item.name,
      slug: product.slug,
      salesPrice: item.price ?? 0,
      images: [...item.imageUrls],
    };
    productByName.set(key, ref);
    summary.itemsCreated++;
    return ref;
  };

  const upsertPuja = async (puja: ParsedPuja) => {
    const key = puja.name.trim().toLowerCase();
    const existing = pujaByName.get(key);
    if (puja.warnings) summary.warnings.push(...puja.warnings);

    const data: Record<string, unknown> = {};
    if (puja.description) data.description = puja.description;
    if (puja.imageUrl) data.imageUrl = puja.imageUrl;
    if (puja.isActive !== undefined) data.isActive = puja.isActive;

    let pujaId: string;
    const relink = puja.entries.length > 0;

    if (existing) {
      if (Object.keys(data).length > 0) {
        await prisma.puja.update({ where: { id: existing.id }, data });
      }
      pujaId = existing.id;
      summary.pujasUpdated++;
    } else {
      const created = await prisma.puja.create({
        data: {
          name: puja.name,
          slug: uniqueSlug(slugify(puja.name), usedPujaSlugs),
          description: puja.description ?? null,
          imageUrl: puja.imageUrl ?? null,
          basePrice: 0,
          isActive: puja.isActive ?? true,
        },
      });
      pujaId = created.id;
      pujaByName.set(key, { id: created.id, name: puja.name, slug: created.slug });
      summary.pujasCreated++;
    }

    if (!relink) return;

    // Rebuild this puja's item list from the sheet (same behaviour as the admin dialog).
    await prisma.pujaItem.deleteMany({ where: { pujaId } });
    let sortOrder = 1;
    let baseTotal = 0;
    for (const entry of puja.entries) {
      const entryKey = entry.name.trim().toLowerCase();
      let product = productByName.get(entryKey);
      if (!product) {
        await upsertItem({ name: entry.name, imageUrls: [], warnings: [] });
        product = productByName.get(entryKey)!;
        summary.warnings.push(
          `Item "${entry.name}" (needed by puja "${puja.name}") was not in the database and was created with price Rs 0 — add it to the Puja Items sheet with a price and re-import to fix it.`,
        );
      }
      const price = product.salesPrice;
      await prisma.pujaItem.create({
        data: {
          pujaId,
          productId: product.id,
          name: product.name ?? entry.name,
          unit: 'pc',
          price,
          defaultQty: entry.qty,
          sortOrder: sortOrder++,
        },
      });
      baseTotal += price * entry.qty;
      summary.linksCreated++;
    }
    await prisma.puja.update({ where: { id: pujaId }, data: { basePrice: Math.round(baseTotal * 100) / 100 } });
  };

  // 1) Upsert puja samagri items, then 2) upsert pujas + relink their items.
  for (const item of items) {
    await upsertItem(item);
  }
  for (const puja of pujas) {
    await upsertPuja(puja);
  }

  return summary;
}
