import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function normalizeProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s{2,}/g, ' ');
}

function slugify(name: string): string {
  return 'puja-' + name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface JsonProduct {
  name: string;
  image: string;
  purchasePrice: string;
  sellingPrice: string;
}

interface JsonCategory {
  name: string;
  product: JsonProduct[];
}

interface JsonPuja {
  name: string;
  item: JsonCategory[];
}

async function main() {
  const jsonPath = join(process.cwd(), 'new-puja-item.json');
  const rawData = readFileSync(jsonPath, 'utf-8');
  const pujasData: JsonPuja[] = JSON.parse(rawData);

  const pujaCategory = await prisma.category.findUnique({ where: { slug: 'puja-samagri' } });
  if (!pujaCategory) {
    throw new Error('Puja samagri category not found. Run seed first.');
  }

  console.log(`\n=== Puja Samagri Import ===\n`);
  console.log(`Pujas in JSON: ${pujasData.length}`);

  const allPujas = await prisma.puja.findMany();
  const pujaByName = new Map(allPujas.map(p => [p.name.toLowerCase().trim(), p]));
  console.log(`Pujas in DB: ${allPujas.length}`);

  // ---- Step 1: remove ALL existing puja_samagri products + their item links ----
  const oldProducts = await prisma.product.findMany({
    where: { productType: 'puja_samagri' },
    select: { id: true },
  });
  const oldIds = oldProducts.map(p => p.id);

  if (oldIds.length > 0) {
    const deletedItems = await prisma.pujaItem.deleteMany({
      where: { productId: { in: oldIds } },
    });
    console.log(`Removed ${deletedItems.count} old puja item link(s)`);

    const deletedProducts = await prisma.product.deleteMany({
      where: { productType: 'puja_samagri' },
    });
    console.log(`Removed ${deletedProducts.count} old puja_samagri product(s)`);
  } else {
    console.log('No existing puja_samagri products to remove.');
  }

  // ---- Step 2: import fresh from new-puja-item.json ----
  const productByNormalName = new Map<string, any>();

  let productsCreated = 0;
  let productsReused = 0;
  let assignmentsCreated = 0;
  let pujasNotFound = 0;
  let itemsFailed = 0;

  for (const pujaData of pujasData) {
    const puja = pujaByName.get(pujaData.name.toLowerCase().trim());
    if (!puja) {
      console.warn(`  ⚠ Puja not found in DB: "${pujaData.name}"`);
      pujasNotFound++;
      continue;
    }

    let sortOrder = 0;
    const rows: { product: any; category: string; sortOrder: number }[] = [];

    for (const categoryGroup of pujaData.item) {
      const category = categoryGroup.name.toLowerCase().trim();
      if (!['basic', 'special', 'recommended'].includes(category)) {
        console.warn(`  ⚠ Unknown category "${category}" in puja "${pujaData.name}"`);
        continue;
      }

      for (const item of categoryGroup.product) {
        const normalizedName = normalizeProductName(item.name);
        sortOrder++;
        let product = productByNormalName.get(normalizedName);

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: item.name,
              slug: slugify(item.name) + '-' + Math.random().toString(36).slice(2, 6),
              productType: 'puja_samagri',
              categoryId: pujaCategory.id,
              purchasePrice: parseFloat(item.purchasePrice) || 0,
              salesPrice: parseFloat(item.sellingPrice) || 0,
              discountPercent: 0,
              quantityType: 'piece',
              quantity: 1,
              stockType: 'piece',
              stock: 100,
              isActive: true,
              isFeatured: false,
              metadata: { source: 'new_puja_item_json' },
            },
          });
          if (item.image) {
            await prisma.productImage.create({
              data: { productId: product.id, url: item.image, alt: item.name, sortOrder: 0 },
            });
          }
          productByNormalName.set(normalizedName, product);
          productsCreated++;
        } else {
          productsReused++;
        }

        rows.push({ product, category, sortOrder });
      }
    }

    if (rows.length > 0) {
      await prisma.pujaItem.createMany({
        data: rows.map((row) => ({
          pujaId: puja.id,
          productId: row.product.id,
          name: row.product.name,
          category: row.category,
          unit: 'pc',
          price: row.product.salesPrice,
          defaultQty: 1,
          sortOrder: row.sortOrder,
        })),
      });
      assignmentsCreated += rows.length;
    }

    const items = await prisma.pujaItem.findMany({ where: { pujaId: puja.id } });
    const totalPrice = items.reduce((sum, i) => sum + Number(i.price) * i.defaultQty, 0);
    await prisma.puja.update({
      where: { id: puja.id },
      data: { basePrice: totalPrice },
    });

    console.log(`  ✓ ${pujaData.name}: ${sortOrder} items, base_price ₹${totalPrice}`);
  }

  console.log(`\n=== Migration Report ===`);
  console.log(`Total Pujas processed: ${pujasData.length - pujasNotFound}`);
  console.log(`Pujas not found in DB: ${pujasNotFound}`);
  console.log(`New products created: ${productsCreated}`);
  console.log(`Existing products reused: ${productsReused}`);
  console.log(`Puja assignments created: ${assignmentsCreated}`);
  console.log(`Items failed: ${itemsFailed}`);
  console.log(`\nImport complete!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());