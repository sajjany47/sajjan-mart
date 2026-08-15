import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'food' },
      update: {},
      create: { name: 'Food', slug: 'food', description: 'Cloud kitchen - fresh meals delivered hot', imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: 'puja-samagri' },
      update: {},
      create: { name: 'Puja Samagri', slug: 'puja-samagri', description: 'Complete puja packages with pandit booking', imageUrl: 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=600', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: 'natural-products' },
      update: {},
      create: { name: 'Natural Products', slug: 'natural-products', description: 'Farm-fresh organic products direct from farmers', imageUrl: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=600', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: 'general' },
      update: {},
      create: { name: 'General', slug: 'general', description: 'Everything else - electronics, fashion, home and more', imageUrl: 'https://images.pexels.com/photos/4498136/pexels-photo-4498136.jpeg?auto=compress&cs=tinysrgb&w=600', sortOrder: 4 },
    }),
  ]);
  console.log(`Upserted ${categories.length} categories`);

  const [food, pujaSamagri, natural, general] = categories;

  // Subcategories
  const subData = [
    { categoryId: food.id, name: 'Pizza', slug: 'pizza' },
    { categoryId: food.id, name: 'Burger', slug: 'burger' },
    { categoryId: food.id, name: 'Momos', slug: 'momos' },
    { categoryId: food.id, name: 'Biryani', slug: 'biryani' },
    { categoryId: food.id, name: 'Rolls', slug: 'rolls' },
    { categoryId: food.id, name: 'Beverages', slug: 'beverages' },
    { categoryId: natural.id, name: 'Oils', slug: 'oils' },
    { categoryId: natural.id, name: 'Grains', slug: 'grains' },
    { categoryId: natural.id, name: 'Spices', slug: 'spices' },
    { categoryId: natural.id, name: 'Honey & Ghee', slug: 'honey-ghee' },
    { categoryId: general.id, name: 'Electronics', slug: 'electronics' },
    { categoryId: general.id, name: 'Fashion', slug: 'fashion' },
    { categoryId: general.id, name: 'Home & Kitchen', slug: 'home-kitchen' },
    { categoryId: general.id, name: 'Beauty', slug: 'beauty' },
  ];
  const subCategories = await Promise.all(
    subData.map((s) => prisma.subCategory.upsert({
      where: { categoryId_slug: { categoryId: s.categoryId, slug: s.slug } },
      update: {},
      create: s,
    }))
  );
  console.log(`Upserted ${subCategories.length} subcategories`);

  const [pizza, burger, momos, biryani, rolls, beverages, oils, grains, spices, honeyGhee, electronics, fashion, homeKitchen, beauty] = subCategories;

  // Brands
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { slug: 'sajjan-kitchen' }, update: {}, create: { name: 'Sajjan Kitchen', slug: 'sajjan-kitchen' } }),
    prisma.brand.upsert({ where: { slug: 'farm-fresh' }, update: {}, create: { name: 'Farm Fresh', slug: 'farm-fresh' } }),
    prisma.brand.upsert({ where: { slug: 'pure-organic' }, update: {}, create: { name: 'Pure Organic', slug: 'pure-organic' } }),
    prisma.brand.upsert({ where: { slug: 'technova' }, update: {}, create: { name: 'TechNova', slug: 'technova' } }),
    prisma.brand.upsert({ where: { slug: 'urbanwear' }, update: {}, create: { name: 'UrbanWear', slug: 'urbanwear' } }),
    prisma.brand.upsert({ where: { slug: 'homestyle' }, update: {}, create: { name: 'HomeStyle', slug: 'homestyle' } }),
  ]);
  console.log(`Upserted ${brands.length} brands`);

  const [sajjanKitchen, farmFresh, pureOrganic, techNova, urbanwear, homestyle] = brands;

  // Banners
  const banners = [
    { title: 'Sajjan Mart - One Stop for Everything', subtitle: 'Food, Puja Samagri, Natural Products & More', imageUrl: 'https://images.pexels.com/photos/5650049/pexels-photo-5650049.jpeg?auto=compress&cs=tinysrgb&w=1600', ctaText: 'Shop Now', ctaLink: '/shop', sortOrder: 1 },
    { title: 'Fresh from our Cloud Kitchen', subtitle: 'Hot meals delivered to your door', imageUrl: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600', ctaText: 'Order Food', ctaLink: '/category/food', sortOrder: 2 },
    { title: 'Complete Puja Packages', subtitle: 'Pandit + Samagri in one booking', imageUrl: 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=1600', ctaText: 'Book Puja', ctaLink: '/puja', sortOrder: 3 },
    { title: '100% Organic, Direct from Farmers', subtitle: 'No chemicals, no adulteration', imageUrl: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=1600', ctaText: 'Explore', ctaLink: '/category/natural-products', sortOrder: 4 },
  ];
  for (const b of banners) await prisma.banner.create({ data: b }).catch(() => {});
  console.log(`Created ${banners.length} banners`);

  // Coupons
  const coupons = [
    { code: 'WELCOME10', description: '10% off on first order', discountPercent: 10, maxDiscount: 200, minOrder: 500, validUntil: new Date(Date.now() + 365 * 86400000) },
    { code: 'SAJJAN20', description: '20% off - max Rs 500', discountPercent: 20, maxDiscount: 500, minOrder: 1000, validUntil: new Date(Date.now() + 90 * 86400000) },
    { code: 'PUJA15', description: '15% off on puja bookings', discountPercent: 15, maxDiscount: 300, minOrder: 600, validUntil: new Date(Date.now() + 180 * 86400000) },
  ];
  for (const c of coupons) await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
  console.log(`Created ${coupons.length} coupons`);

  // Food products
  const foodProducts = [
    { name: 'Margherita Pizza', slug: 'margherita-pizza', description: 'Classic pizza with fresh mozzarella, basil and tomato sauce', categoryId: food.id, subCategoryId: pizza.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'pizza', quantityType: 'inch', quantity: 12, stockType: 'inch', stock: 0, foodType: 'veg', purchasePrice: 149.4, salesPrice: 249, discountPercent: 10, rating: 4.5, reviewCount: 128, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true, metadata: { ingredients: ['mozzarella', 'basil', 'tomato sauce'], prepTime: '20 min', veg: true } },
    { name: 'Chicken Tikka Pizza', slug: 'chicken-tikka-pizza', description: 'Tandoori chicken tikka with onions, capsicum and mint mayo', categoryId: food.id, subCategoryId: pizza.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'pizza', quantityType: 'inch', quantity: 12, stockType: 'inch', stock: 0, foodType: 'non_veg', purchasePrice: 209.4, salesPrice: 349, discountPercent: 15, rating: 4.7, reviewCount: 96, isFeatured: true, isBestSeller: true, isPopular: true, metadata: { ingredients: ['chicken tikka', 'onion', 'capsicum'], prepTime: '25 min', veg: false } },
    { name: 'Classic Veg Burger', slug: 'classic-veg-burger', description: 'Crispy patty with cheese, lettuce and tomato', categoryId: food.id, subCategoryId: burger.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'burger', quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 0, foodType: 'veg', purchasePrice: 77.4, salesPrice: 129, rating: 4.3, reviewCount: 210, isBestSeller: true, isPopular: true, isTodayDeal: true, metadata: { ingredients: ['veg patty', 'cheese', 'lettuce'], prepTime: '15 min', veg: true } },
    { name: 'Steamed Veg Momos', slug: 'steamed-veg-momos', description: '8 pieces of steamed dumplings with spicy chutney', categoryId: food.id, subCategoryId: momos.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'momos', quantityType: 'pack', quantity: 8, stockType: 'pack', stock: 0, foodType: 'veg', purchasePrice: 59.4, salesPrice: 99, rating: 4.6, reviewCount: 320, isFeatured: true, isBestSeller: true, isPopular: true, metadata: { ingredients: ['flour', 'cabbage', 'carrot'], prepTime: '18 min', veg: true } },
    { name: 'Chicken Biryani', slug: 'chicken-biryani', description: 'Fragrant basmati rice with marinated chicken and aromatic spices', categoryId: food.id, subCategoryId: biryani.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'biryani', quantityType: 'gram', quantity: 400, stockType: 'gram', stock: 0, foodType: 'non_veg', purchasePrice: 137.4, salesPrice: 229, discountPercent: 12, rating: 4.8, reviewCount: 410, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true, metadata: { ingredients: ['basmati rice', 'chicken', 'saffron'], prepTime: '30 min', veg: false } },
    { name: 'Chicken Popcorn', slug: 'chicken-popcorn', description: 'Bite-sized crispy chicken pieces with dip', categoryId: food.id, subCategoryId: rolls.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'rolls_wraps', quantityType: 'gram', quantity: 200, stockType: 'gram', stock: 0, foodType: 'non_veg', purchasePrice: 107.4, salesPrice: 179, rating: 4.4, reviewCount: 88, isPopular: true, metadata: { ingredients: ['chicken', 'flour', 'spices'], prepTime: '12 min', veg: false } },
    { name: 'Paneer Roll', slug: 'paneer-roll', description: 'Tandoori paneer wrapped in soft roti with mint chutney', categoryId: food.id, subCategoryId: rolls.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'rolls_wraps', quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 0, foodType: 'veg', purchasePrice: 89.4, salesPrice: 149, rating: 4.5, reviewCount: 142, isBestSeller: true, isPopular: true, metadata: { ingredients: ['paneer', 'roti', 'onion'], prepTime: '10 min', veg: true } },
    { name: 'French Fries', slug: 'french-fries', description: 'Crispy golden fries with peri peri seasoning', categoryId: food.id, subCategoryId: rolls.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'snacks', quantityType: 'gram', quantity: 200, stockType: 'gram', stock: 0, foodType: 'veg', purchasePrice: 53.4, salesPrice: 89, rating: 4.2, reviewCount: 180, isBestSeller: true, isPopular: true, isTodayDeal: true, metadata: { ingredients: ['potato', 'peri peri'], prepTime: '8 min', veg: true } },
    { name: 'Cold Coffee', slug: 'cold-coffee', description: 'Chilled creamy coffee with ice cream', categoryId: food.id, subCategoryId: beverages.id, brandId: sajjanKitchen.id, productType: 'food', productCategory: 'beverages', quantityType: 'ml', quantity: 250, stockType: 'ml', stock: 0, foodType: 'veg', purchasePrice: 71.4, salesPrice: 119, rating: 4.6, reviewCount: 75, isPopular: true, metadata: { ingredients: ['coffee', 'milk', 'ice cream'], prepTime: '5 min', veg: true } },
  ];
  for (const p of foodProducts) {
    const { name, slug, ...fields } = p;
    await prisma.product.upsert({ where: { slug }, update: fields as any, create: p as any });
  }
  console.log(`Created ${foodProducts.length} food products`);

  // Add-on items
  const addOnSeeds = [
    { name: 'Extra Cheese', price: 40 },
    { name: 'Extra Chicken', price: 60 },
    { name: 'Extra Sauce', price: 20 },
    { name: 'Extra Toppings', price: 50 },
    { name: 'Jalapenos', price: 30 },
    { name: 'Cold Drink (250ml)', price: 35 },
  ];
  const addOnItems = await Promise.all(
    addOnSeeds.map(async (a) => {
      const existing = await prisma.addOnItem.findFirst({ where: { name: a.name } });
      if (existing) return existing;
      return prisma.addOnItem.create({ data: a });
    })
  );
  const addOnLinks = {
    'margherita-pizza': ['Extra Cheese', 'Extra Toppings'],
    'chicken-tikka-pizza': ['Extra Cheese', 'Extra Chicken'],
    'classic-veg-burger': ['Extra Cheese', 'Extra Sauce'],
    'chicken-biryani': ['Extra Chicken', 'Extra Sauce'],
    'steamed-veg-momos': ['Extra Sauce'],
    'french-fries': ['Extra Sauce', 'Cold Drink (250ml)'],
    'cold-coffee': ['Cold Drink (250ml)'],
  };
  for (const [slug, names] of Object.entries(addOnLinks)) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) continue;
    for (const name of names) {
      const addOn = addOnItems.find((a) => a.name === name);
      if (!addOn) continue;
      await prisma.productAddOn.upsert({
        where: { productId_addOnId: { productId: product.id, addOnId: addOn.id } },
        update: {},
        create: { productId: product.id, addOnId: addOn.id },
      });
    }
  }
  console.log(`Seeded ${addOnItems.length} add-on items and linked them to food products`);

  // Natural products
  const naturalProducts = [
    { name: 'Mustard Oil', slug: 'mustard-oil', description: 'Pure mustard oil made from quality mustard seeds, perfect for cooking, frying and traditional Indian recipes.', categoryId: natural.id, subCategoryId: oils.id, brandId: farmFresh.id, productType: 'natural', productCategory: 'oil_ghee', quantityType: 'ml', quantity: 1000, stockType: 'pack', stock: 120, purchasePrice: 192, salesPrice: 320, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Haldi Powder', slug: 'haldi-powder', description: 'Pure turmeric powder with natural color and aroma, ideal for everyday cooking and traditional dishes.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 200, purchasePrice: 72, salesPrice: 120, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Garam Masala Powder', slug: 'garam-masala-powder', description: 'Aromatic blend of selected Indian spices that adds rich flavor and fragrance to curries, vegetables and other dishes.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 180, purchasePrice: 84, salesPrice: 140, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Garam Masala Gota', slug: 'garam-masala-gota', description: 'Whole aromatic spices carefully selected for preparing fresh and flavorful homemade garam masala.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 250, stockType: 'pack', stock: 160, purchasePrice: 96, salesPrice: 160, isFeatured: true, isPopular: true },
    { name: 'Dhaniya Powder', slug: 'dhaniya-powder', description: 'Freshly ground coriander powder with a natural aroma, perfect for adding authentic flavor to Indian curries and vegetables.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 200, purchasePrice: 66, salesPrice: 110, isFeatured: true, isPopular: true },
    { name: 'Jeera Powder', slug: 'jeera-powder', description: 'Aromatic cumin powder made from quality cumin seeds, ideal for curries, raita, snacks and everyday cooking.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 200, purchasePrice: 78, salesPrice: 130, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Lal Mirch Powder', slug: 'lal-mirch-powder', description: 'Finely ground red chilli powder that adds a delicious spicy kick and vibrant color to your favorite dishes.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 200, purchasePrice: 84, salesPrice: 140, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Adrak Lahsun Paste', slug: 'adrak-lahsun-paste', description: 'Fresh ginger and garlic paste, convenient for everyday cooking and perfect for curries, marinades and non-veg preparations.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 500, stockType: 'pack', stock: 150, purchasePrice: 54, salesPrice: 90, isFeatured: true, isPopular: true },
    { name: 'Kashmiri Mirch Powder', slug: 'kashmiri-mirch-powder', description: 'Mildly spicy red chilli powder known for its beautiful natural red color and rich aroma, perfect for curries and marinades.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 180, purchasePrice: 132, salesPrice: 220, isFeatured: true, isPopular: true },
    { name: 'Chicken Preparation Masala', slug: 'chicken-preparation-masala', description: 'A specially blended spice mix for delicious chicken dishes, making it easy to prepare flavorful and aromatic chicken at home.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 170, purchasePrice: 90, salesPrice: 150, isFeatured: true, isPopular: true },
    { name: 'Mutton Preparation Masala', slug: 'mutton-preparation-masala', description: 'A traditional blend of aromatic spices specially prepared for mutton dishes, giving your curry a rich and authentic taste.', categoryId: natural.id, subCategoryId: spices.id, brandId: pureOrganic.id, productType: 'natural', productCategory: 'masala_spices', quantityType: 'gram', quantity: 200, stockType: 'pack', stock: 170, purchasePrice: 96, salesPrice: 160, isFeatured: true, isPopular: true },
  ];
  for (const p of naturalProducts) {
    const { name, slug, ...fields } = p;
    await prisma.product.upsert({ where: { slug }, update: fields as any, create: p as any });
  }
  console.log(`Created ${naturalProducts.length} natural products`);

  // General products
  const generalProducts = [
    { name: 'Wireless Bluetooth Earbuds', slug: 'wireless-bluetooth-earbuds', description: 'True wireless earbuds with ANC and 30hr playback', categoryId: general.id, subCategoryId: electronics.id, brandId: techNova.id, productType: 'general', purchasePrice: 1199.4, salesPrice: 1999, productCategory: 'electronics', gender: 'all', quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 250, discountPercent: 25, rating: 4.4, reviewCount: 540, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true },
    { name: 'Smart Fitness Band', slug: 'smart-fitness-band', description: 'Heart rate, SpO2, sleep tracking with 14-day battery', categoryId: general.id, subCategoryId: electronics.id, brandId: techNova.id, productType: 'general', purchasePrice: 899.4, salesPrice: 1499, productCategory: 'electronics', gender: 'all', quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 200, discountPercent: 15, rating: 4.3, reviewCount: 320, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Cotton Casual Shirt', slug: 'cotton-casual-shirt', description: 'Breathable cotton shirt for everyday wear', categoryId: general.id, subCategoryId: fashion.id, brandId: urbanwear.id, productType: 'general', purchasePrice: 479.4, salesPrice: 799, productCategory: 'fashion', gender: 'men', quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 300, discountPercent: 20, rating: 4.2, reviewCount: 210, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true },
    { name: 'Non-stick Cookware Set', slug: 'non-stick-cookware-set', description: '5-piece non-stick cookware with granite coating', categoryId: general.id, subCategoryId: homeKitchen.id, brandId: homestyle.id, productType: 'general', purchasePrice: 1499.4, salesPrice: 2499, productCategory: 'home', gender: 'all', quantityType: 'piece', quantity: 5, stockType: 'piece', stock: 80, discountPercent: 30, rating: 4.5, reviewCount: 180, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true },
    { name: 'Ayurvedic Face Wash', slug: 'ayurvedic-face-wash', description: 'Gentle herbal face wash with neem and turmeric', categoryId: general.id, subCategoryId: beauty.id, brandId: pureOrganic.id, productType: 'general', purchasePrice: 149.4, salesPrice: 249, productCategory: 'beauty', gender: 'all', quantityType: 'ml', quantity: 150, stockType: 'piece', stock: 180, discountPercent: 10, rating: 4.4, reviewCount: 410, isBestSeller: true, isPopular: true },
    { name: 'Stainless Steel Water Bottle', slug: 'stainless-steel-water-bottle', description: 'Insulated 1L bottle keeps cold 24h', categoryId: general.id, subCategoryId: homeKitchen.id, brandId: homestyle.id, productType: 'general', purchasePrice: 359.4, salesPrice: 599, productCategory: 'home', gender: 'all', quantityType: 'ml', quantity: 1000, stockType: 'piece', stock: 140, rating: 4.6, reviewCount: 260, isBestSeller: true, isPopular: true },
    { name: 'Yoga Mat Premium', slug: 'yoga-mat-premium', description: '6mm anti-slip TPE yoga mat with carry strap', categoryId: general.id, subCategoryId: homeKitchen.id, brandId: homestyle.id, productType: 'general', purchasePrice: 419.4, salesPrice: 699, productCategory: 'home', gender: 'all', quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 100, discountPercent: 18, rating: 4.5, reviewCount: 150, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true },
  ];
  for (const p of generalProducts) {
    const { name, slug, ...fields } = p;
    await prisma.product.upsert({ where: { slug }, update: fields as any, create: p as any });
  }
  console.log(`Created ${generalProducts.length} general products`);

  // Puja samagri products
  const pujaSamagriProducts = [
    { name: 'Fresh Coconut (Nariyal)', slug: 'puja-coconut', description: 'Fresh green coconut for puja, prasad and offering', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'coconut_nariyal', purchasePrice: 30, salesPrice: 49, quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 200, rating: 4.7, reviewCount: 56, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Agarbatti (Incense Sticks)', slug: 'puja-agarbatti', description: 'Hand-rolled sandalwood incense sticks for daily puja', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'agarbatti', purchasePrice: 18, salesPrice: 35, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 300, rating: 4.5, reviewCount: 120, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Camphor (Kapur)', slug: 'puja-camphor', description: 'Pure natural camphor tablets for aarti and havan', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'camphor_kapur', purchasePrice: 28, salesPrice: 49, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 250, rating: 4.6, reviewCount: 78, isFeatured: true, isPopular: true },
    { name: 'Deep (Earthen Diya Set)', slug: 'puja-deep-diya', description: 'Pack of 10 earthen diyas with cotton wicks', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'deep_diya', purchasePrice: 42, salesPrice: 69, quantityType: 'piece', quantity: 10, stockType: 'piece', stock: 150, rating: 4.8, reviewCount: 95, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true },
    { name: 'Kapor (Red Vastra)', slug: 'puja-kapor', description: 'Traditional red kapor cloth used in puja and god seating', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'kapor_vastra', purchasePrice: 55, salesPrice: 89, quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 180, rating: 4.4, reviewCount: 40, isBestSeller: true, isPopular: true },
    { name: 'Fool (Marigold Flowers)', slug: 'puja-fool', description: 'Fresh marigold flowers garland and loose petals for offering', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'fool_flowers', purchasePrice: 45, salesPrice: 75, quantityType: 'bunch', quantity: 1, stockType: 'bunch', stock: 220, rating: 4.7, reviewCount: 88, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Gamcha (Pandit Dhoti)', slug: 'puja-gamcha', description: 'Cotton gamcha cloth offered as dakshina to pandit', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'gamcha', purchasePrice: 80, salesPrice: 129, quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 120, rating: 4.3, reviewCount: 32, isPopular: true },
    { name: 'Pure Desi Ghee (500ml)', slug: 'puja-ghee', description: 'A2 cow ghee for havan ahuti, diya and prasad', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'ghee', purchasePrice: 290, salesPrice: 399, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 90, rating: 4.9, reviewCount: 150, isFeatured: true, isBestSeller: true, isPopular: true },
    { name: 'Akshat (Rice)', slug: 'puja-rice-akshat', description: 'Yellow-coloured akshat rice for abhishek and offerings', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'rice_akshat', purchasePrice: 35, salesPrice: 59, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 260, rating: 4.5, reviewCount: 66, isBestSeller: true, isPopular: true },
    { name: 'Brass Kalash', slug: 'puja-brass-kalash', description: 'Traditional brass kalash for purnima and griha pravesh', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'kalash', purchasePrice: 260, salesPrice: 449, quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 40, rating: 4.8, reviewCount: 52, isFeatured: true, isPopular: true },
    { name: 'Betel Leaf (Paan Patta)', slug: 'puja-betel-leaf', description: 'Fresh betel leaves for puja offerings and paan', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'betel_leaf', purchasePrice: 22, salesPrice: 39, quantityType: 'bunch', quantity: 1, stockType: 'bunch', stock: 200, rating: 4.4, reviewCount: 28, isPopular: true },
    { name: 'Fruits (Fal for Prasad)', slug: 'puja-fruits', description: 'Seasonal assorted fruits selected fresh for prasad', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'fruits_fal', purchasePrice: 110, salesPrice: 169, quantityType: 'kg', quantity: 1, stockType: 'kg', stock: 80, rating: 4.6, reviewCount: 45, isFeatured: true, isPopular: true },
    { name: 'Roli & Kumkum', slug: 'puja-roli-kumkum', description: 'Sacred roli and kumkum for tilak and worship', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'roli_kumkum', purchasePrice: 25, salesPrice: 45, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 300, rating: 4.6, reviewCount: 74, isBestSeller: true, isPopular: true },
    { name: 'Haldi (Turmeric) Powder', slug: 'puja-haldi', description: 'Natural haldi for puja, havan and marriage rituals', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'haldi', purchasePrice: 30, salesPrice: 49, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 280, rating: 4.5, reviewCount: 38, isPopular: true },
    { name: 'Chandan (Sandalwood) Powder', slug: 'puja-chandan', description: 'Pure sandalwood powder for tilak and abhishek', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'chandan', purchasePrice: 55, salesPrice: 89, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 160, rating: 4.7, reviewCount: 61, isFeatured: true, isPopular: true },
    { name: 'Supari (Betel Nut)', slug: 'puja-supari', description: 'Whole betel nuts for puja and panchamrit', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'supari', purchasePrice: 35, salesPrice: 55, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 190, rating: 4.4, reviewCount: 24, isPopular: true },
    { name: 'Elaichi (Cardamom)', slug: 'puja-elaichi', description: 'Premium green cardamom for prasad and havan', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'elaichi', purchasePrice: 130, salesPrice: 199, quantityType: 'pack', quantity: 1, stockType: 'pack', stock: 70, rating: 4.7, reviewCount: 42, isFeatured: true, isPopular: true },
    { name: 'Ganga Jal (Holy Water)', slug: 'puja-ganga-jal', description: 'Bottled Ganga jal for abhishek and home purification', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'ganga_jal', purchasePrice: 70, salesPrice: 110, quantityType: 'bottle', quantity: 1, stockType: 'bottle', stock: 250, rating: 4.8, reviewCount: 133, isFeatured: true, isBestSeller: true, isPopular: true, isTodayDeal: true },
    { name: 'Moli (Kalava)', slug: 'puja-moli-kalava', description: 'Sacred red moli thread for tying around wrist and kalash', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'moli_kalava', purchasePrice: 10, salesPrice: 19, quantityType: 'piece', quantity: 1, stockType: 'piece', stock: 400, rating: 4.5, reviewCount: 84, isBestSeller: true, isPopular: true },
    { name: 'Bel Patra (Leaves)', slug: 'puja-bel-patra', description: 'Fresh bel patra leaves for Shiva puja and abhishek', categoryId: pujaSamagri.id, productType: 'puja_samagri', productCategory: 'bel_patra', purchasePrice: 14, salesPrice: 29, quantityType: 'bunch', quantity: 1, stockType: 'bunch', stock: 220, rating: 4.6, reviewCount: 57, isFeatured: true, isPopular: true },
  ];
  for (const p of pujaSamagriProducts) {
    const { name, slug, ...fields } = p;
    await prisma.product.upsert({ where: { slug }, update: fields as any, create: p as any });
  }
  console.log(`Created ${pujaSamagriProducts.length} puja samagri products`);

  // Product images
  const allProducts = await prisma.product.findMany();
  const imageMap: Record<string, string[]> = {
    'margherita-pizza': ['https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'chicken-tikka-pizza': ['https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'classic-veg-burger': ['https://images.pexels.com/photos/1639559/pexels-photo-1639559.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'steamed-veg-momos': ['https://images.pexels.com/photos/7437483/pexels-photo-7437483.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'chicken-biryani': ['https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'chicken-popcorn': ['https://images.pexels.com/photos/60616/fried-food-pan-fry-oil-60616.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'paneer-roll': ['https://images.pexels.com/photos/674572/pexels-photo-674572.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'french-fries': ['https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'cold-coffee': ['https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'cold-pressed-mustard-oil': ['https://images.pexels.com/photos/33783/olive-oil-oil-cooking-oil-olive.jpg?auto=compress&cs=tinysrgb&w=800'],
    'mustard-oil': ['https://images.pexels.com/photos/33783/olive-oil-oil-cooking-oil-olive.jpg?auto=compress&cs=tinysrgb&w=800'],
    'haldi-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'garam-masala-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'garam-masala-gota': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'dhaniya-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'jeera-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'lal-mirch-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'adrak-lahsun-paste': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'kashmiri-mirch-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'chicken-preparation-masala': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'mutton-preparation-masala': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'organic-turmeric-powder': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'premium-basmati-rice': ['https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'whole-wheat-atta': ['https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'raw-forest-honey': ['https://images.pexels.com/photos/33260/bee-honey-sweet-syrup-33260.jpg?auto=compress&cs=tinysrgb&w=800'],
    'a2-desi-cow-ghee': ['https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'organic-toor-dal': ['https://images.pexels.com/photos/2282582/pexels-photo-2282582.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'whole-spices-combo': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'ragi-millet-flour': ['https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'wireless-bluetooth-earbuds': ['https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'smart-fitness-band': ['https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'cotton-casual-shirt': ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'non-stick-cookware-set': ['https://images.pexels.com/photos/4226806/pexels-photo-4226806.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'ayurvedic-face-wash': ['https://images.pexels.com/photos/3373508/pexels-photo-3373508.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'stainless-steel-water-bottle': ['https://images.pexels.com/photos/1188649/pexels-photo-1188649.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'yoga-mat-premium': ['https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-coconut': ['https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-agarbatti': ['https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-camphor': ['https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-deep-diya': ['https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-kapor': ['https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-fool': ['https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-gamcha': ['https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-ghee': ['https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-rice-akshat': ['https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-brass-kalash': ['https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-betel-leaf': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-fruits': ['https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-roli-kumkum': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-haldi': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-chandan': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-supari': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-elaichi': ['https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-ganga-jal': ['https://images.pexels.com/photos/1188649/pexels-photo-1188649.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-moli-kalava': ['https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800'],
    'puja-bel-patra': ['https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800'],
  };
  let imgCount = 0;
  for (const p of allProducts) {
    const urls = imageMap[p.slug];
    if (urls) {
      await prisma.productImage.deleteMany({ where: { productId: p.id } });
      for (let i = 0; i < urls.length; i++) {
        await prisma.productImage.create({ data: { productId: p.id, url: urls[i], alt: p.name, sortOrder: i } });
        imgCount++;
      }
    }
  }
  console.log(`Created ${imgCount} product images`);

  // Pujas (Kolkata festivals)
  const pujas = [
    { name: 'Durga Puja', slug: 'durga-puja', description: "Kolkata's most famous festival, celebrated with grand pandals, beautiful idols, cultural programs, traditional food and joyful celebrations.", imageUrl: 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Kali Puja', slug: 'kali-puja', description: 'A major festival of Kolkata celebrated with devotion to Goddess Kali, beautifully decorated pandals, lights and traditional sweets.', imageUrl: 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Diwali', slug: 'diwali', description: 'The festival of lights, celebrated with diyas, decorative lights, sweets, gifts and joyful gatherings with family and friends.', imageUrl: 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Chhath Puja', slug: 'chhath-puja', description: 'A traditional festival dedicated to the Sun God, celebrated with devotion, fasting, offerings and special prasad near rivers and water bodies.', imageUrl: 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Poila Boishakh', slug: 'poila-boishakh', description: 'The Bengali New Year, celebrated with traditional Bengali food, new clothes, cultural programs and auspicious beginnings.', imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Saraswati Puja', slug: 'saraswati-puja', description: 'A popular Bengali festival dedicated to Goddess Saraswati, celebrated with prayers, decorations, cultural activities and traditional food.', imageUrl: 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Lakshmi Puja', slug: 'lakshmi-puja', description: 'A traditional Bengali festival dedicated to Goddess Lakshmi, celebrated with prayers, beautiful decorations, sweets and special festive dishes.', imageUrl: 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Jagaddhatri Puja', slug: 'jagaddhatri-puja', description: 'A beautiful Bengali festival celebrated with grand idols, colorful decorations, lights and cultural celebrations across Kolkata and nearby areas.', imageUrl: 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Holi', slug: 'holi', description: 'The vibrant festival of colors, celebrated with colors, sweets, music, festive food and joyful gatherings with family and friends.', imageUrl: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Janmashtami', slug: 'janmashtami', description: 'A devotional festival celebrating the birth of Lord Krishna with prayers, decorations, devotional programs and festive food.', imageUrl: 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Christmas', slug: 'christmas', description: 'Kolkata celebrates Christmas with beautifully decorated streets, lights, cakes, delicious food and festive gatherings.', imageUrl: 'https://images.pexels.com/photos/5650049/pexels-photo-5650049.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: '31st December', slug: 'december-31', description: 'A special year-end celebration with parties, delicious food, cakes, decorations and memorable moments with family and friends.', imageUrl: 'https://images.pexels.com/photos/5650049/pexels-photo-5650049.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Birthday', slug: 'birthday', description: 'Make birthdays special with cakes, sweets, snacks, decorations and delicious food for a memorable celebration.', imageUrl: 'https://images.pexels.com/photos/1639559/pexels-photo-1639559.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
    { name: 'Marriage Anniversary', slug: 'marriage-anniversary', description: 'Celebrate your special relationship with delicious food, cakes, sweets and thoughtful gifts for a memorable anniversary.', imageUrl: 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', basePrice: 2205 },
  ];
  for (const p of pujas) {
    await prisma.puja.upsert({ where: { slug: p.slug }, update: {}, create: p });
  }
  console.log(`Created ${pujas.length} pujas`);

  // Puja items (derived from puja samagri products)
  const allPujas = await prisma.puja.findMany();
  const pujaSamagriProductsInDb = await prisma.product.findMany({
    where: { productType: 'puja_samagri', isActive: true },
    orderBy: { name: 'asc' },
  });
  let pujaItemCount = 0;
  for (const puja of allPujas) {
    await prisma.pujaItem.deleteMany({ where: { pujaId: puja.id } });
    let sort = 1;
    let itemTotal = 0;
    for (const prod of pujaSamagriProductsInDb) {
      await prisma.pujaItem.create({
        data: {
          pujaId: puja.id,
          productId: prod.id,
          name: prod.name,
          unit: prod.quantityType ?? 'pc',
          price: prod.salesPrice,
          defaultQty: 1,
          sortOrder: sort++,
        },
      });
      itemTotal += Number(prod.salesPrice);
      pujaItemCount++;
    }
    await prisma.puja.update({ where: { id: puja.id }, data: { basePrice: itemTotal } });
  }
  console.log(`Created ${pujaItemCount} puja items`);

  // Pandits
  const pandits = [
    { name: 'Pandit Ravi Shastri', experience: 15, languages: ['Hindi', 'Sanskrit', 'English'], rating: 4.9, price: 500, photoUrl: 'https://images.pexels.com/photos/220277/pexels-photo-220277.jpeg?auto=compress&cs=tinysrgb&w=400', bio: 'Vedic scholar specializing in Satyanarayan and Griha Pravesh pujas' },
    { name: 'Pandit Anand Joshi', experience: 12, languages: ['Hindi', 'Marathi', 'Sanskrit'], rating: 4.8, price: 450, photoUrl: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400', bio: 'Expert in all 16 sanskaras and marriage ceremonies' },
    { name: 'Pandit Krishna Iyer', experience: 20, languages: ['Tamil', 'Sanskrit', 'English'], rating: 5.0, price: 600, photoUrl: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400', bio: 'South Indian Vedic rituals and Navgraha pujas' },
    { name: 'Pandit Suresh Upadhyay', experience: 8, languages: ['Hindi', 'Bhojpuri', 'Sanskrit'], rating: 4.6, price: 350, photoUrl: 'https://images.pexels.com/photos/220277/pexels-photo-220277.jpeg?auto=compress&cs=tinysrgb&w=400', bio: 'Specialist in Mundan and small home pujas' },
  ];
  const panditRecords = [];
  for (const p of pandits) {
    const existing = await prisma.pandit.findFirst({ where: { name: p.name } });
    if (existing) { panditRecords.push(existing); continue; }
    const record = await prisma.pandit.create({ data: p });
    panditRecords.push(record);
  }
  console.log(`Upserted ${panditRecords.length} pandits`);

  // Assign pandits to all pujas
  await prisma.pujaPandit.deleteMany({});
  let pujaPanditCount = 0;
  for (const puja of allPujas) {
    for (const pandit of panditRecords) {
      await prisma.pujaPandit.create({ data: { pujaId: puja.id, panditId: pandit.id } });
      pujaPanditCount++;
    }
  }
  console.log(`Created ${pujaPanditCount} puja-pandit assignments`);

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
