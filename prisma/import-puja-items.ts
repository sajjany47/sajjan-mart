import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { FESTIVAL_ITEMS, type PujaListItem } from '../puja-item';

const prisma = new PrismaClient();

// Only store image paths that actually exist (ProductCard falls back to a placeholder otherwise)
function imageExists(image?: string): boolean {
  if (!image) return false;
  if (/^https?:\/\//.test(image)) return true;
  return fs.existsSync(path.join(process.cwd(), 'public', image.replace(/^\//, '')));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Map curated item names onto the product_category chips used by /category/puja-samagri
function categoryFor(name: string): string {
  const n = name.toLowerCase();
  if (/coconut/.test(n)) return 'coconut_nariyal';
  if (/camphor|kapur/.test(n)) return 'camphor_kapur';
  if (/kalash/.test(n)) return 'kalash';
  if (/diya|diyas|deep|clay lamp|clay lamp/.test(n)) return 'deep_diya';
  if (/incense|agarbatti|dhoop/.test(n)) return 'agarbatti';
  if (/ghee/.test(n)) return 'ghee';
  if (/rice/.test(n)) return 'rice_akshat';
  if (/betel leaf|betel leaves|paan/.test(n)) return 'betel_leaf';
  if (/betel nut|supari/.test(n)) return 'supari';
  if (/gangajal|ganga/.test(n)) return 'ganga_jal';
  if (/haldi|turmeric/.test(n)) return 'haldi';
  if (/chandan|sandalwood/.test(n)) return 'chandan';
  if (/elaichi|cardamom/.test(n)) return 'elaichi';
  if (/roli|kumkum|sindoor/.test(n)) return 'roli_kumkum';
  if (/moli|kalava|sacred thread|thread/.test(n)) return 'moli_kalava';
  if (/bel leaf|bel patra|bel leaves/.test(n)) return 'bel_patra';
  if (/gamcha|cloth|vastra|kapor/.test(n)) return 'kapor_vastra';
  if (/flower|marigold|lotus|garland|rose|hibiscus|palash/.test(n)) return 'fool_flowers';
  if (/apple|banana|orange|mango|grape|guava|pomegranate|sugarcane|lemon|coconut|pineapple|radish|ginger|water chestnut|sweet potato|panta/.test(n)) return 'fruits_fal';
  if (/pandit|dhoti/.test(n)) return 'gamcha';
  return 'other';
}

async function main() {
  const pujaCategory = await prisma.category.findUnique({ where: { slug: 'puja-samagri' } });
  if (!pujaCategory) throw new Error('Puja Samagri category not found. Run npm run seed first.');

  const subCategories = await prisma.subCategory.findMany({ where: { categoryId: pujaCategory.id } });

  const allPujas = await prisma.puja.findMany();
  const bySlug = new Map(allPujas.map((p) => [p.slug, p]));

  // 1. Remove old generic puja samagri products + their links
  const deletedProducts = await prisma.product.deleteMany({ where: { productType: 'puja_samagri' } });
  const deletedItems = await prisma.pujaItem.deleteMany({});
  console.log(`Removed ${deletedProducts.count} old puja products and ${deletedItems.count} old puja item links`);

  // 2. Insert ONE product per unique item name (deduped across festivals)
  const uniqueItems = new Map<string, { item: PujaListItem; price: number }>();
  for (const list of Object.values(FESTIVAL_ITEMS)) {
    for (const item of list) {
      const key = item.itemName.trim().toLowerCase();
      const existing = uniqueItems.get(key);
      if (existing) {
        existing.price = Math.max(existing.price, item.price);
      } else {
        uniqueItems.set(key, { item, price: item.price });
      }
    }
  }

  const existingSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));
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

  const productByKey = new Map<string, string>();
  let created = 0;
  let images = 0;
  for (const [key, { item, price }] of Array.from(uniqueItems).sort((a, b) => a[0].localeCompare(b[0]))) {
    const productCategory = categoryFor(item.itemName);
    const brand = await prisma.brand.findUnique({ where: { slug: 'farm-fresh' } });
    const product = await prisma.product.create({
      data: {
        name: item.itemName,
        slug: uniqueSlug(`puja-${slugify(item.itemName)}`),
        description: `${item.itemName} — puja samagri item for festive celebrations.`,
        productType: 'puja_samagri',
        categoryId: pujaCategory.id,
        subCategoryId: subCategories.find((s) => s.slug === productCategory)?.id ?? null,
        brandId: brand?.id ?? null,
        productCategory,
        quantityType: 'piece',
        quantity: 1,
        stockType: 'piece',
        stock: 100,
        purchasePrice: Math.round(price * 0.6),
        salesPrice: price,
        discountPercent: 0,
        isActive: true,
        isFeatured: true,
        metadata: { source: 'puja_item_list' },
      },
    });
    if (imageExists(item.image)) {
      await prisma.productImage.create({
        data: { productId: product.id, url: item.image!, alt: item.itemName, sortOrder: 0 },
      });
      images++;
    }
    productByKey.set(key, product.id);
    created++;
  }
  console.log(`Created ${created} unique puja products (deduped by item name) with ${images} image(s)`);

  // 3. Link each festival to its curated items and recompute base_price
  let links = 0;
  for (const [slug, puja] of Array.from(bySlug)) {
    const list = FESTIVAL_ITEMS[slug] ?? [];
    let sort = 1;
    let itemTotal = 0;
    for (const item of list) {
      const key = item.itemName.trim().toLowerCase();
      const productId = productByKey.get(key);
      await prisma.pujaItem.create({
        data: {
          pujaId: puja.id,
          productId: productId ?? null,
          name: item.itemName,
          unit: 'pc',
          price: item.price,
          defaultQty: 1,
          sortOrder: sort++,
        },
      });
      itemTotal += item.price;
      links++;
    }
    await prisma.puja.update({ where: { id: puja.id }, data: { basePrice: itemTotal } });
    console.log(`  ${puja.name}: ${list.length} items, basePrice ${itemTotal}`);
  }
  console.log(`Linked ${links} puja items across festivals`);

  console.log('Puja item list import complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());