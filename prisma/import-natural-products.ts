import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NaturalSeed {
  name: string;
  description: string;
  productCategory: string;
  subCategorySlug: string;
  brandSlug: string;
  quantityType: string;
  quantity: number;
  stock: number;
  salesPrice: number;
  purchasePrice: number;
  imageUrl: string;
}

const NATURAL_PRODUCTS: NaturalSeed[] = [
  {
    name: 'Mustard Oil',
    description: 'Pure mustard oil made from quality mustard seeds, perfect for cooking, frying and traditional Indian recipes.',
    productCategory: 'oil_ghee',
    subCategorySlug: 'oils',
    brandSlug: 'farm-fresh',
    quantityType: 'ml',
    quantity: 1000,
    stock: 120,
    salesPrice: 320,
    purchasePrice: 192,
    imageUrl: 'https://images.pexels.com/photos/33783/olive-oil-oil-cooking-oil-olive.jpg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Haldi Powder',
    description: 'Pure turmeric powder with natural color and aroma, ideal for everyday cooking and traditional dishes.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 200,
    salesPrice: 120,
    purchasePrice: 72,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Garam Masala Powder',
    description: 'Aromatic blend of selected Indian spices that adds rich flavor and fragrance to curries, vegetables and other dishes.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 180,
    salesPrice: 140,
    purchasePrice: 84,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Garam Masala Gota',
    description: 'Whole aromatic spices carefully selected for preparing fresh and flavorful homemade garam masala.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 250,
    stock: 160,
    salesPrice: 160,
    purchasePrice: 96,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Dhaniya Powder',
    description: 'Freshly ground coriander powder with a natural aroma, perfect for adding authentic flavor to Indian curries and vegetables.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 200,
    salesPrice: 110,
    purchasePrice: 66,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Jeera Powder',
    description: 'Aromatic cumin powder made from quality cumin seeds, ideal for curries, raita, snacks and everyday cooking.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 200,
    salesPrice: 130,
    purchasePrice: 78,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Lal Mirch Powder',
    description: 'Finely ground red chilli powder that adds a delicious spicy kick and vibrant color to your favorite dishes.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 200,
    salesPrice: 140,
    purchasePrice: 84,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Adrak Lahsun Paste',
    description: 'Fresh ginger and garlic paste, convenient for everyday cooking and perfect for curries, marinades and non-veg preparations.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 500,
    stock: 150,
    salesPrice: 90,
    purchasePrice: 54,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Kashmiri Mirch Powder',
    description: 'Mildly spicy red chilli powder known for its beautiful natural red color and rich aroma, perfect for curries and marinades.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 180,
    salesPrice: 220,
    purchasePrice: 132,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Chicken Preparation Masala',
    description: 'A specially blended spice mix for delicious chicken dishes, making it easy to prepare flavorful and aromatic chicken at home.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 170,
    salesPrice: 150,
    purchasePrice: 90,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Mutton Preparation Masala',
    description: 'A traditional blend of aromatic spices specially prepared for mutton dishes, giving your curry a rich and authentic taste.',
    productCategory: 'masala_spices',
    subCategorySlug: 'spices',
    brandSlug: 'pure-organic',
    quantityType: 'gram',
    quantity: 200,
    stock: 170,
    salesPrice: 160,
    purchasePrice: 96,
    imageUrl: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const naturalCategory = await prisma.category.findUnique({ where: { slug: 'natural-products' } });
  if (!naturalCategory) throw new Error('Natural products category not found. Run npm run seed first.');

  const subCategories = await prisma.subCategory.findMany({ where: { categoryId: naturalCategory.id } });

  // 1. Delete all old natural products so the list below is authoritative
  const deleted = await prisma.product.deleteMany({ where: { productType: 'natural' } });
  console.log(`Removed ${deleted.count} old natural products`);

  // 2. Insert the new natural lineup
  let created = 0;
  let images = 0;
  for (const spec of NATURAL_PRODUCTS) {
    const subCategory = subCategories.find((s) => s.slug === spec.subCategorySlug);
    const brand = await prisma.brand.findUnique({ where: { slug: spec.brandSlug } });

    const product = await prisma.product.create({
      data: {
        name: spec.name,
        slug: slugify(spec.name),
        description: spec.description,
        productType: 'natural',
        categoryId: naturalCategory.id,
        subCategoryId: subCategory?.id ?? null,
        brandId: brand?.id ?? null,
        productCategory: spec.productCategory,
        quantityType: spec.quantityType,
        quantity: spec.quantity,
        stockType: 'pack',
        stock: spec.stock,
        purchasePrice: spec.purchasePrice,
        salesPrice: spec.salesPrice,
        discountPercent: 0,
        isActive: true,
        isFeatured: true,
        isBestSeller: true,
        isPopular: true,
        metadata: { source: 'natural_products' },
      },
    });
    await prisma.productImage.create({
      data: { productId: product.id, url: spec.imageUrl, alt: spec.name, sortOrder: 0 },
    });
    created++;
    images++;
  }
  console.log(`Created ${created} natural products with ${images} image(s)`);
  console.log('Natural products import complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());