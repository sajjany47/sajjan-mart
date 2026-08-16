import { PrismaClient } from '@prisma/client';
import { FESTIVAL_ITEMS } from '../puja-item';

const prisma = new PrismaClient();

interface FestivalSeed {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
}

const KOLKATA_FESTIVALS: FestivalSeed[] = [
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

async function main() {
  // 1. Delete all existing pujas so the list below is authoritative
  const deleted = await prisma.puja.deleteMany({});
  console.log(`Removed ${deleted.count} old pujas`);

  // 2. Insert the Kolkata festivals
  let created = 0;
  for (const f of KOLKATA_FESTIVALS) {
    await prisma.puja.create({ data: f });
    created++;
  }
  console.log(`Created ${created} festival pujas`);

  // 3. Rebuild puja items from the curated per-festival lists (same as import:puja-items)
  const allPujas = await prisma.puja.findMany();
  const curatedProducts = await prisma.product.findMany({
    where: { productType: 'puja_samagri', isActive: true },
  });
  const productByLowerName = new Map(
    curatedProducts.map((p) => [p.name.trim().toLowerCase(), p])
  );
  let pujaItemCount = 0;
  for (const puja of allPujas) {
    await prisma.pujaItem.deleteMany({ where: { pujaId: puja.id } });
    const list = FESTIVAL_ITEMS[puja.slug] ?? [];
    let sort = 1;
    let itemTotal = 0;
    for (const item of list) {
      const prod = productByLowerName.get(item.itemName.trim().toLowerCase());
      await prisma.pujaItem.create({
        data: {
          pujaId: puja.id,
          productId: prod?.id ?? null,
          name: item.itemName,
          unit: 'pc',
          price: item.price,
          defaultQty: 1,
          sortOrder: sort++,
        },
      });
      itemTotal += item.price;
      pujaItemCount++;
    }
    await prisma.puja.update({ where: { id: puja.id }, data: { basePrice: itemTotal } });
  }
  console.log(`Linked ${pujaItemCount} puja items (basePrice recomputed per festival)`);

  // 4. Link all pandits to every festival (same as seed)
  const pandits = await prisma.pandit.findMany();
  await prisma.pujaPandit.deleteMany({});
  let links = 0;
  for (const puja of allPujas) {
    for (const pandit of pandits) {
      await prisma.pujaPandit.create({ data: { pujaId: puja.id, panditId: pandit.id } });
      links++;
    }
  }
  console.log(`Linked ${links} pandit assignments across festivals`);

  console.log('Kolkata festivals import complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());