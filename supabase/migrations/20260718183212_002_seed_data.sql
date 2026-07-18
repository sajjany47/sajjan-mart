/*
# Sajjan Mart - Seed Data

Populates catalog with demo data across all four verticals.
All images use Pexels stock photos. Prices in INR.
*/

-- Categories
INSERT INTO public.categories (name, slug, description, image_url, sort_order) VALUES
('Food', 'food', 'Cloud kitchen - fresh meals delivered hot', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', 1),
('Puja Samagri', 'puja-samagri', 'Complete puja packages with pandit booking', 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=600', 2),
('Natural Products', 'natural-products', 'Farm-fresh organic products direct from farmers', 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=600', 3),
('General', 'general', 'Everything else - electronics, fashion, home and more', 'https://images.pexels.com/photos/4498136/pexels-photo-4498136.jpeg?auto=compress&cs=tinysrgb&w=600', 4)
ON CONFLICT (slug) DO NOTHING;

-- Subcategories
INSERT INTO public.sub_categories (category_id, name, slug) VALUES
((SELECT id FROM public.categories WHERE slug='food'), 'Pizza', 'pizza'),
((SELECT id FROM public.categories WHERE slug='food'), 'Burger', 'burger'),
((SELECT id FROM public.categories WHERE slug='food'), 'Momos', 'momos'),
((SELECT id FROM public.categories WHERE slug='food'), 'Biryani', 'biryani'),
((SELECT id FROM public.categories WHERE slug='food'), 'Rolls', 'rolls'),
((SELECT id FROM public.categories WHERE slug='food'), 'Beverages', 'beverages'),
((SELECT id FROM public.categories WHERE slug='natural-products'), 'Oils', 'oils'),
((SELECT id FROM public.categories WHERE slug='natural-products'), 'Grains', 'grains'),
((SELECT id FROM public.categories WHERE slug='natural-products'), 'Spices', 'spices'),
((SELECT id FROM public.categories WHERE slug='natural-products'), 'Honey & Ghee', 'honey-ghee'),
((SELECT id FROM public.categories WHERE slug='general'), 'Electronics', 'electronics'),
((SELECT id FROM public.categories WHERE slug='general'), 'Fashion', 'fashion'),
((SELECT id FROM public.categories WHERE slug='general'), 'Home & Kitchen', 'home-kitchen'),
((SELECT id FROM public.categories WHERE slug='general'), 'Beauty', 'beauty')
ON CONFLICT DO NOTHING;

-- Brands
INSERT INTO public.brands (name, slug, logo_url) VALUES
('Sajjan Kitchen', 'sajjan-kitchen', NULL),
('Farm Fresh', 'farm-fresh', NULL),
('Pure Organic', 'pure-organic', NULL),
('TechNova', 'technova', NULL),
('UrbanWear', 'urbanwear', NULL),
('HomeStyle', 'homestyle', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Banners
INSERT INTO public.banners (title, subtitle, image_url, cta_text, cta_link, sort_order) VALUES
('Sajjan Mart - One Stop for Everything', 'Food, Puja Samagri, Natural Products & More', 'https://images.pexels.com/photos/5650049/pexels-photo-5650049.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Shop Now', '/shop', 1),
('Fresh from our Cloud Kitchen', 'Hot meals delivered to your door', 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Order Food', '/category/food', 2),
('Complete Puja Packages', 'Pandit + Samagri in one booking', 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Book Puja', '/puja', 3),
('100% Organic, Direct from Farmers', 'No chemicals, no adulteration', 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Explore', '/category/natural-products', 4)
ON CONFLICT DO NOTHING;

-- Coupons
INSERT INTO public.coupons (code, description, discount_percent, max_discount, min_order, is_active, valid_until) VALUES
('WELCOME10', '10% off on first order', 10, 200, 500, true, now() + interval '365 days'),
('SAJJAN20', '20% off - max Rs 500', 20, 500, 1000, true, now() + interval '90 days'),
('PUJA15', '15% off on puja bookings', 15, 300, 600, true, now() + interval '180 days')
ON CONFLICT (code) DO NOTHING;

-- Food products
INSERT INTO public.products (name, slug, description, category_id, sub_category_id, brand_id, product_type, base_price, discount_percent, rating, review_count, is_featured, is_best_seller, is_popular, is_today_deal, metadata) VALUES
('Margherita Pizza', 'margherita-pizza', 'Classic pizza with fresh mozzarella, basil and tomato sauce', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='pizza'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 249, 10, 4.5, 128, true, true, true, true, '{"ingredients":["mozzarella","basil","tomato sauce","oregano"],"prep_time":"20 min","veg":true,"available":true,"spice":"mild"}'),
('Chicken Tikka Pizza', 'chicken-tikka-pizza', 'Tandoori chicken tikka with onions, capsicum and mint mayo', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='pizza'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 349, 15, 4.7, 96, true, true, true, false, '{"ingredients":["chicken tikka","onion","capsicum","mint mayo"],"prep_time":"25 min","veg":false,"available":true,"spice":"medium"}'),
('Classic Veg Burger', 'classic-veg-burger', 'Crispy patty with cheese, lettuce and tomato', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='burger'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 129, 0, 4.3, 210, false, true, true, true, '{"ingredients":["veg patty","cheese","lettuce","tomato"],"prep_time":"15 min","veg":true,"available":true}'),
('Steamed Veg Momos', 'steamed-veg-momos', '8 pieces of steamed dumplings with spicy chutney', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='momos'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 99, 0, 4.6, 320, true, true, true, false, '{"ingredients":["flour","cabbage","carrot","onion"],"prep_time":"18 min","veg":true,"available":true}'),
('Chicken Biryani', 'chicken-biryani', 'Fragrant basmati rice with marinated chicken and aromatic spices', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='biryani'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 229, 12, 4.8, 410, true, true, true, true, '{"ingredients":["basmati rice","chicken","saffron","mint","yogurt"],"prep_time":"30 min","veg":false,"available":true,"spice":"medium"}'),
('Chicken Popcorn', 'chicken-popcorn', 'Bite-sized crispy chicken pieces with dip', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='rolls'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 179, 0, 4.4, 88, false, false, true, false, '{"ingredients":["chicken","flour","spices"],"prep_time":"12 min","veg":false,"available":true}'),
('Paneer Roll', 'paneer-roll', 'Tandoori paneer wrapped in soft roti with mint chutney', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='rolls'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 149, 0, 4.5, 142, false, true, true, false, '{"ingredients":["paneer","roti","onion","mint chutney"],"prep_time":"10 min","veg":true,"available":true}'),
('French Fries', 'french-fries', 'Crispy golden fries with peri peri seasoning', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='rolls'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 89, 0, 4.2, 180, false, true, true, true, '{"ingredients":["potato","peri peri"],"prep_time":"8 min","veg":true,"available":true}'),
('Cold Coffee', 'cold-coffee', 'Chilled creamy coffee with ice cream', (SELECT id FROM public.categories WHERE slug='food'), (SELECT id FROM public.sub_categories WHERE slug='beverages'), (SELECT id FROM public.brands WHERE slug='sajjan-kitchen'), 'food', 119, 0, 4.6, 75, false, false, true, false, '{"ingredients":["coffee","milk","ice cream"],"prep_time":"5 min","veg":true,"available":true}')
ON CONFLICT (slug) DO NOTHING;

-- Natural products
INSERT INTO public.products (name, slug, description, category_id, sub_category_id, brand_id, product_type, base_price, discount_percent, rating, review_count, is_featured, is_best_seller, is_popular, is_today_deal, metadata) VALUES
('Cold Pressed Mustard Oil', 'cold-pressed-mustard-oil', 'Traditional wood-pressed mustard oil from organic seeds', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='oils'), (SELECT id FROM public.brands WHERE slug='farm-fresh'), 'natural', 320, 5, 4.7, 64, true, true, true, false, '{"organic_cert":true,"farmer":"Ramesh Kumar","farm_location":"Muzaffarpur, Bihar","harvest_date":"2025-03-15","stock":120}'),
('Organic Turmeric Powder', 'organic-turmeric-powder', 'High-curcumin turmeric, sun-dried and stone-ground', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='spices'), (SELECT id FROM public.brands WHERE slug='pure-organic'), 'natural', 180, 0, 4.8, 92, true, true, true, true, '{"organic_cert":true,"farmer":"Sita Devi","farm_location":"Erode, Tamil Nadu","harvest_date":"2025-02-20","stock":200}'),
('Premium Basmati Rice', 'premium-basmati-rice', 'Aged 2-year basmati from the foothills of Himalayas', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='grains'), (SELECT id FROM public.brands WHERE slug='farm-fresh'), 'natural', 450, 8, 4.6, 48, true, true, true, false, '{"organic_cert":true,"farmer":"Harjeet Singh","farm_location":"Karnal, Haryana","harvest_date":"2024-11-10","stock":80}'),
('Whole Wheat Atta', 'whole-wheat-atta', 'Stone-ground wheat flour from MP Sharbati wheat', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='grains'), (SELECT id FROM public.brands WHERE slug='farm-fresh'), 'natural', 240, 0, 4.5, 56, false, true, true, false, '{"organic_cert":true,"farmer":"Mohan Lal","farm_location":"Bhopal, MP","harvest_date":"2025-04-05","stock":150}'),
('Raw Forest Honey', 'raw-forest-honey', 'Multi-floral raw honey harvested by tribal communities', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='honey-ghee'), (SELECT id FROM public.brands WHERE slug='pure-organic'), 'natural', 380, 10, 4.9, 110, true, true, true, true, '{"organic_cert":true,"farmer":"Tribal Co-op","farm_location":"Sundarbans, WB","harvest_date":"2025-01-18","stock":60}'),
('A2 Desi Cow Ghee', 'a2-desi-cow-ghee', 'Bilona method ghee from grass-fed Gir cows', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='honey-ghee'), (SELECT id FROM public.brands WHERE slug='pure-organic'), 'natural', 890, 5, 4.9, 78, true, true, true, false, '{"organic_cert":true,"farmer":"Gir Farm","farm_location":"Junagadh, Gujarat","harvest_date":"2025-05-01","stock":40}'),
('Organic Toor Dal', 'organic-toor-dal', 'Unpolished toor dal, rich in protein', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='grains'), (SELECT id FROM public.brands WHERE slug='farm-fresh'), 'natural', 160, 0, 4.4, 36, false, false, true, false, '{"organic_cert":true,"farmer":"Farmer Co-op","farm_location":"Latur, Maharashtra","harvest_date":"2025-03-22","stock":180}'),
('Whole Spices Combo', 'whole-spices-combo', 'Mixed whole spices - cardamom, clove, cinnamon, bay leaf', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='spices'), (SELECT id FROM public.brands WHERE slug='pure-organic'), 'natural', 520, 12, 4.7, 44, true, true, true, true, '{"organic_cert":true,"farmer":"Spice Co-op","farm_location":"Idukki, Kerala","harvest_date":"2025-02-15","stock":70}'),
('Ragi Millet Flour', 'ragi-millet-flour', 'Calcium-rich finger millet flour', (SELECT id FROM public.categories WHERE slug='natural-products'), (SELECT id FROM public.sub_categories WHERE slug='grains'), (SELECT id FROM public.brands WHERE slug='farm-fresh'), 'natural', 140, 0, 4.5, 28, false, false, true, false, '{"organic_cert":true,"farmer":"Millets Co-op","farm_location":"Bengaluru, Karnataka","harvest_date":"2025-04-12","stock":95}')
ON CONFLICT (slug) DO NOTHING;

-- General products
INSERT INTO public.products (name, slug, description, category_id, sub_category_id, brand_id, product_type, base_price, discount_percent, rating, review_count, is_featured, is_best_seller, is_popular, is_today_deal, metadata) VALUES
('Wireless Bluetooth Earbuds', 'wireless-bluetooth-earbuds', 'True wireless earbuds with ANC and 30hr playback', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='electronics'), (SELECT id FROM public.brands WHERE slug='technova'), 'general', 1999, 25, 4.4, 540, true, true, true, true, '{"warranty":"1 year","color":"black"}'),
('Smart Fitness Band', 'smart-fitness-band', 'Heart rate, SpO2, sleep tracking with 14-day battery', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='electronics'), (SELECT id FROM public.brands WHERE slug='technova'), 'general', 1499, 15, 4.3, 320, true, true, true, false, '{"warranty":"1 year","color":"black"}'),
('Cotton Casual Shirt', 'cotton-casual-shirt', 'Breathable cotton shirt for everyday wear', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='fashion'), (SELECT id FROM public.brands WHERE slug='urbanwear'), 'general', 799, 20, 4.2, 210, true, true, true, true, '{"material":"cotton","sizes":["S","M","L","XL"]}'),
('Non-stick Cookware Set', 'non-stick-cookware-set', '5-piece non-stick cookware with granite coating', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='home-kitchen'), (SELECT id FROM public.brands WHERE slug='homestyle'), 'general', 2499, 30, 4.5, 180, true, true, true, true, '{"pieces":5,"warranty":"2 years"}'),
('Ayurvedic Face Wash', 'ayurvedic-face-wash', 'Gentle herbal face wash with neem and turmeric', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='beauty'), (SELECT id FROM public.brands WHERE slug='pure-organic'), 'general', 249, 10, 4.4, 410, false, true, true, false, '{"volume":"100ml"}'),
('Stainless Steel Water Bottle', 'stainless-steel-water-bottle', 'Insulated 1L bottle keeps cold 24h', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='home-kitchen'), (SELECT id FROM public.brands WHERE slug='homestyle'), 'general', 599, 0, 4.6, 260, false, true, true, false, '{"capacity":"1L","color":"steel"}'),
('Yoga Mat Premium', 'yoga-mat-premium', '6mm anti-slip TPE yoga mat with carry strap', (SELECT id FROM public.categories WHERE slug='general'), (SELECT id FROM public.sub_categories WHERE slug='home-kitchen'), (SELECT id FROM public.brands WHERE slug='homestyle'), 'general', 699, 18, 4.5, 150, true, true, true, true, '{"thickness":"6mm","color":"purple"}')
ON CONFLICT (slug) DO NOTHING;

-- Product images
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'margherita-pizza';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'chicken-tikka-pizza';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1639559/pexels-photo-1639559.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'classic-veg-burger';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/7437483/pexels-photo-7437483.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'steamed-veg-momos';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'chicken-biryani';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/60616/fried-food-pan-fry-oil-60616.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'chicken-popcorn';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/674572/pexels-photo-674572.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'paneer-roll';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'french-fries';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'cold-coffee';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/33783/olive-oil-oil-cooking-oil-olive.jpg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'cold-pressed-mustard-oil';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'organic-turmeric-powder';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'premium-basmati-rice';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'whole-wheat-atta';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/33260/bee-honey-sweet-syrup-33260.jpg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'raw-forest-honey';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'a2-desi-cow-ghee';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/2282582/pexels-photo-2282582.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'organic-toor-dal';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'whole-spices-combo';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'ragi-millet-flour';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'wireless-bluetooth-earbuds';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'smart-fitness-band';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'cotton-casual-shirt';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/4226806/pexels-photo-4226806.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'non-stick-cookware-set';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/3373508/pexels-photo-3373508.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'ayurvedic-face-wash';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/1188649/pexels-photo-1188649.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'stainless-steel-water-bottle';
INSERT INTO public.product_images (product_id, url, alt, sort_order)
SELECT p.id, 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=800', p.name, 0
FROM public.products p WHERE p.slug = 'yoga-mat-premium';

-- Pujas
INSERT INTO public.pujas (name, slug, description, image_url, base_price) VALUES
('Satyanarayan Puja', 'satyanarayan-puja', 'Performed for prosperity, harmony and family well-being', 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', 1100),
('Durga Puja', 'durga-puja', 'Worship of Goddess Durga for strength and protection', 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', 2500),
('Lakshmi Puja', 'lakshmi-puja', 'Inviting Goddess Lakshmi for wealth and prosperity', 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', 1300),
('Ganesh Puja', 'ganesh-puja', 'Worship of Lord Ganesha for new beginnings and obstacle removal', 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', 1000),
('Griha Pravesh', 'griha-pravesh', 'Housewarming puja for peace and positivity in new home', 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', 2100),
('Navgraha Puja', 'navgraha-puja', 'Puja to pacify the nine planets and reduce negative effects', 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', 1800),
('Mundan Sanskar', 'mundan-sanskar', 'First haircut ceremony for the child', 'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800', 800),
('Marriage Puja', 'marriage-puja', 'Complete marriage ceremony with all rituals', 'https://images.pexels.com/photos/8230812/pexels-photo-8230812.jpeg?auto=compress&cs=tinysrgb&w=800', 5100)
ON CONFLICT (slug) DO NOTHING;

-- Puja items (shared pool, assigned to each puja)
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Coconut', 'pc', 40, 1, 1 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Agarbatti', 'pack', 25, 2, 2 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Camphor', 'pack', 50, 1, 3 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Ghee', 'kg', 250, 1, 4 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Rice', 'kg', 60, 1, 5 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Flowers', 'bunch', 50, 2, 6 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Kalash', 'pc', 120, 1, 7 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Betel Leaf', 'bunch', 30, 1, 8 FROM public.pujas p;
INSERT INTO public.puja_items (puja_id, name, unit, price, default_qty, sort_order)
SELECT p.id, 'Fruits', 'kg', 100, 2, 9 FROM public.pujas p;

-- Pandits
INSERT INTO public.pandits (name, experience, languages, rating, price, photo_url, bio) VALUES
('Pandit Ravi Shastri', 15, ARRAY['Hindi','Sanskrit','English'], 4.9, 500, 'https://images.pexels.com/photos/220277/pexels-photo-220277.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vedic scholar specializing in Satyanarayan and Griha Pravesh pujas'),
('Pandit Anand Joshi', 12, ARRAY['Hindi','Marathi','Sanskrit'], 4.8, 450, 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400', 'Expert in all 16 sanskaras and marriage ceremonies'),
('Pandit Krishna Iyer', 20, ARRAY['Tamil','Sanskrit','English'], 5.0, 600, 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400', 'South Indian Vedic rituals and Navgraha pujas'),
('Pandit Suresh Upadhyay', 8, ARRAY['Hindi','Bhojpuri','Sanskrit'], 4.6, 350, 'https://images.pexels.com/photos/220277/pexels-photo-220277.jpeg?auto=compress&cs=tinysrgb&w=400', 'Specialist in Mundan and small home pujas')
ON CONFLICT DO NOTHING;

-- Assign pandits to pujas
INSERT INTO public.puja_pandits (puja_id, pandit_id)
SELECT p.id, pa.id FROM public.pujas p, public.pandits pa
ON CONFLICT DO NOTHING;
