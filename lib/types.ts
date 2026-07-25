export type ProductType = 'food' | 'puja_samagri' | 'natural' | 'general';
export type FoodType = 'veg' | 'non_veg' | 'egg';
export type QuantityType = 'piece' | 'inch' | 'gram' | 'ml' | 'pack';
export type GenderType = 'men' | 'women' | 'baby' | 'men_women_both' | 'all';
export type ProductCategory = 'electronics' | 'fashion' | 'food' | 'beauty' | 'home' | 'sports' | 'books' | 'toys' | 'automotive' | 'other';
export type UserRole = 'admin' | 'customer';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return'
  | 'refunded';
export type PaymentMethod = 'cod' | 'razorpay' | 'cashfree';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_type: ProductType;
  category_id: string | null;
  sub_category_id: string | null;
  brand_id: string | null;
  purchase_price: number;
  sales_price: number;
  discount_percent: number;
  quantity_type: QuantityType | null;
  quantity: number | null;
  food_type: FoodType | null;
  gender: GenderType | null;
  product_category: ProductCategory | null;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_best_seller: boolean;
  is_popular: boolean;
  is_today_deal: boolean;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  category?: Category;
  sub_category?: SubCategory | null;
  brand?: Brand | null;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

export interface Puja {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  is_active: boolean;
}

export interface PujaItem {
  id: string;
  puja_id: string;
  name: string;
  unit: string;
  price: number;
  default_qty: number;
  sort_order: number;
}

export interface Pandit {
  id: string;
  name: string;
  experience: number;
  languages: string[];
  rating: number;
  price: number;
  photo_url: string | null;
  bio: string | null;
  is_active: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  max_discount: number;
  min_order: number;
  is_active: boolean;
  valid_until: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  address: Record<string, any>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  puja_id: string | null;
  pandit_id: string | null;
  name: string;
  variant_name: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  total: number;
  item_type: 'product' | 'puja';
  metadata: Record<string, any>;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CartItem {
  id: string;
  type: 'product' | 'puja';
  productId?: string;
  slug?: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  variantName?: string;
  pujaId?: string;
  panditId?: string;
  panditName?: string;
  selectedItems?: { name: string; qty: number; price: number }[];
}
