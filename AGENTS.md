# AGENTS.md — Project Change Log

## 2026-08-14: Compact product-first category pages + server-side product pagination

- **New shared client `components/store/category-products-client.tsx`** — replaces `ShopClient` + `FoodShopClient` on all four category pages (`/category/food`, `/natural-products`, `/general`, `/puja-samagri`). Product-first layout: navbar → compact category name → horizontally scrollable subcategory chips → search + Filter (mobile drawer) + Sort → product count (“Showing X of Y”) → 2-col grid (mobile) / 4-col + sidebar (desktop) → “Load More”. No hero banner / marketing headers.
- `app/api/products/route.ts`: added server-side pagination (`paginate=true`, `start`, `end` → `{ products, total }`) plus new filters `gender` (with men/women `all`/`men_women_both` expansion) and comma-separated `brandId`. Non-paginated shape unchanged.
- `ProductCard`: broken-image fallback — `onError` switches to the ShoppingBag placeholder so broken images never render.
- `app/category/[slug]/page.tsx`: renders the one shared compact client for all 4 category types; food category passes its `FOOD_CATEGORIES` chips for availability filtering like natural/general/puja. `ShopClient` remains only on `/shop`.

## 2026-08-10: Support tickets (customer + admin)
- `SupportTicket` model extended: `order_id` (link to Order), unique `ticket_number` (auto `TKT-...`), `remarks` JSON array (`{remark, by, createdAt, status}`), `updated_at`. Pushed to DB; one existing row backfilled via SQL (`psql`).
- Type `SupportRemark` + `SupportTicket` added; `support_tickets` include map (`user`, `order`) for relation serialization.
- API `app/api/support-tickets`: GET/list + detail now include order (`order_number`, `status`, `total`); POST auto-generates the ticket number.
- Customer `app/account/support/page.tsx`: raising a ticket now requires choosing an **Order** (dropdown of the user's orders) plus subject/issue description; ticket list shows ticket number, linked order, status, and "N update(s)". New `app/account/support/[id]/page.tsx` shows the issue, linked order, and admin remark timeline.
- Admin `app/admin/tickets/page.tsx` ("Tickets" in sidebar nav) — data table of all tickets with status filter tabs (open/in progress/resolved/closed + all), search, customer/order columns, View action.
- Admin `app/admin/tickets/[id]/page.tsx` detail — shows customer, linked order, issue, remark history; form to change **status** and add a **remark for the latest stage** (appended to the `remarks` timeline, visible to the customer).

## 2026-08-09: Zero Charges Banner (No GST, No Tax, No Platform Fees)
- New component `ZeroChargesBanner` (`components/store/zero-charges-banner.tsx`) renders the trust badge detailing "Zero GST, Zero Tax, Zero Platform Fees" with interactive glassmorphism cards.
- Integrated into `app/category/[slug]/page.tsx` (Food, Natural Products, General Products, Puja Samagri), `app/puja/page.tsx` (Puja package bookings), and `app/shop/page.tsx` (general shop).

## 2026-08-09: Coupon cleared when cart changes
- `CartProvider` (`components/providers/cart-provider.tsx`): any `addItem`/`removeItem`/`updateQty`/`clearCart` now also clears the applied coupon, so a stale discount can't persist after the cart contents change (e.g. clear cart, re-add items). Users re-apply the coupon after editing the cart.

## 2026-08-09: Cart transparency notes (item type + food/puja notices)
- Cart (`components/store/cart-client.tsx`) now shows a type badge per item (Food / Natural / Puja Samagri / General / Puja Booking) so users can see what they added.
- Food items display: "Cancellation is not applicable for food items."
- Puja items display: "Delivery date & time may not match your selected booking date & time." plus an extra note for same-day or next-day bookings.
- `CartItem` gained `bookingDate`/`bookingTime`; puja add-to-cart (`puja-detail-client.tsx`) stores them; checkout persists them in order-item `metadata.pujaDate`/`pujaTime`.

## 2026-08-08: One-time coupon usage
- `Coupon` model: new `isOneTime` field (`is_one_time`, default false) pushed to DB and added to `Coupon` type.
- Admin coupon form: "One-Time Use (can be used only once per customer)" checkbox + a `Usage` column (One-Time vs Repeat badge).
- One-time enforcement: cart apply checks the user's past orders (live statuses); server-side `/api/orders` POST also rejects re-use of a one-time coupon per customer so it can't be bypassed.

## 2026-08-08: Admin Coupons page + coupon apply at checkout

- New admin page `app/admin/coupons/page.tsx` ("Coupons" in sidebar nav) — data table with add/edit/delete for coupons (code, description, discount %, max discount, min order, valid until, active). Expired/inactive shown with badges.
- `app/admin/layout.tsx` — added `Coupons` nav link (Tag icon).
- `components/store/checkout-client.tsx` — users can now apply a coupon at checkout: validates code/active/expiry/min-order, shows discount in the order summary, and persists `discount` + `coupon_code` on the created order.
- `lib/format.ts` — added `orderStatusLabel()` (maps `cancel_request` → "Cancel Request" etc.); applied in customer orders list/detail and admin orders.

## 2026-08-08: Add-On Menu for food products

### Data model (Prisma)
- New `AddOnItem` model (`add_on_items`): `name`, `price` (Decimal), `isActive`, timestamps. No image field.
- New `ProductAddOn` join model (`product_add_ons`) — many-to-many between `Product` and `AddOnItem` (cascade delete).

### API
- New CRUD routes: `app/api/add-on-items/route.ts` (GET with `?active=`/`?q=`, POST) and `app/api/add-on-items/[id]/route.ts` (GET/PUT/DELETE).
- `app/api/products/route.ts` + `[id]/route.ts`: product responses now include `addOnLinks: { include: { addOn: true } }` (serialized as `add_on_links`); `POST`/`PUT` accept `addOnIds` and sync `product_add_ons` rows (delete + recreate on update).

### Maps / types
- `lib/supabase/client.ts`: `TABLE_MAP` for `add_on_items` → `add-on-items`, `product_add_ons` → `product-add-ons`.
- `lib/supabase/server.ts`: `modelMap` entries + `RELATION_INCLUDES.products.product_add_ons → addOnLinks` (nested `addOn`).
- `lib/types.ts`: `AddOnItem`, `ProductAddOn`, `Product.add_on_links`, `CartItem.addOns {id,name,price}[]`.

### Admin
- New page `app/admin/addons/page.tsx` ("Add-Ons" in sidebar nav) — CRUD list of add-on items (name, price, isActive).
- Food product form (`app/admin/products/page.tsx`) — section 6 renders checkboxes of all **active** add-ons; selection saved via `addOnIds`.

### Storefront
- New `components/store/addon-dialog.tsx` — dialog that opens when adding a food with add-ons to cart (both product detail + product cards). Shows checkboxes + live price; unit price = base + sum of selected add-ons.
- `product-detail-client.tsx` / `product-card.tsx`: open the dialog when the product has `add_on_links`; addOns are passed into the cart item.
- `cart-provider.tsx`: dedupe key now includes sorted add-on ids (different combos = separate cart lines).

### Orders
- Checkout writes `metadata.addOns` on each order item.
- Add-ons shown in cart, checkout summary, customer order detail (`app/account/orders/[id]`), and admin orders (`app/admin/orders`).

### Seed
- `prisma/seed.ts` seeds 6 demo add-on items and links them to popular food products.

## 2026-08-04: Local PostgreSQL setup (no Docker) + one-command DB setup

### PostgreSQL (no Docker)
- Dev database now runs on **local PostgreSQL** installed natively on Windows (no Docker/Supabase).
- Installed PostgreSQL 16 via winget (`PostgreSQL.PostgreSQL.16`) → `C:\Program Files\PostgreSQL\16`
- Connection used everywhere: `postgresql://postgres:postgres@localhost:5432/sajjan_mart` (in `.env.development`)
- Created `sajjan_mart` database with `pgcrypto` extension enabled (needed for `gen_random_uuid()` defaults)
- Created all tables via `prisma db push` and loaded sample data via `prisma/seed.ts`

### One-command setup for a fresh clone (office laptop)
- Created `scripts/db-setup.ps1` — detects `psql`, reads `DATABASE_URL` from `.env.development`,
  creates the database if missing, enables `pgcrypto`, then runs `prisma db push` + `seed`.
- Added npm scripts:
  - `npm run db:setup` — installs deps, then runs `scripts/db-setup.ps1` (idempotent)
  - `npm run db:reset` — force-resets schema (`prisma db push --force-reset`) then reseeds

### Fresh-clone steps (office laptop)
1. Install PostgreSQL: `winget install --id PostgreSQL.PostgreSQL.16 -e --accept-source-agreements --accept-package-agreements` (set postgres password to `postgres`, or update `.env.development`)
2. `npm run db:setup`
3. `npm run dev`

## 2026-07-19: Dual environment setup (dev & production)

- Created `.env.development` — local Supabase pointing to local PostgreSQL (`postgresql://postgres:postgres@localhost:54322/postgres`)
- Created `.env.production` — production Supabase instance (`awapepidmyfgpfhefpnw.supabase.co`)
- Kept existing `.env` as fallback (ignored by git per `.gitignore`)
- Installed `dotenv-cli` to explicitly control which env file is loaded per script
- Updated scripts in `package.json` to use `dotenv -e <envfile> -- <command>`
  - `npm run dev` → loads `.env.development`
  - `npm run build` → loads `.env.production`
  - `npm run start` / `npm run prod` → loads `.env.production`
- Added `supabase:start` and `supabase:stop` scripts for local Supabase management

## 2026-07-22: Prisma ORM + CRUD API routes + pgAdmin guide

### Prisma Setup
- Installed `prisma@5.22.0` and `@prisma/client@5.22.0`
- Created `prisma/schema.prisma` — 19 models mapped from existing Supabase SQL migrations
- Created `lib/prisma/client.ts` — singleton Prisma client (avoids hot-reload connection leaks)
- Added package.json scripts:
  - `npm run prisma:generate` — generate Prisma client from schema
  - `npm run prisma:push` — push schema to database (dev only)
  - `npm run prisma:pull` — introspect DB and update schema.prisma
  - `npm run prisma:studio` — open Prisma Studio GUI
  - `postinstall` — auto-runs `prisma generate` after npm install

### CRUD API Routes (19 entities, 38 route files)
All routes live under `app/api/<entity>/` with collection + detail handlers:

| Entity | Endpoints | Key Filters |
|--------|-----------|-------------|
| Profiles | `GET/POST /api/profiles`, `GET/PUT/DELETE /api/profiles/[id]` | — |
| Categories | `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/[id]` | `?slug=` |
| SubCategories | `GET/POST /api/sub-categories`, `GET/PUT/DELETE /api/sub-categories/[id]` | `?categoryId=` |
| Brands | `GET/POST /api/brands`, `GET/PUT/DELETE /api/brands/[id]` | `?slug=` |
| Products | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/[id]` | `?slug=`, `?active=`, `?featured=`, `?bestSeller=`, `?popular=`, `?todayDeal=`, `?categoryId=`, `?subCategoryId=`, `?brandId=` |
| ProductImages | `GET/POST /api/product-images`, `GET/PUT/DELETE /api/product-images/[id]` | `?productId=` |
| ProductVariants | `GET/POST /api/product-variants`, `GET/PUT/DELETE /api/product-variants/[id]` | `?productId=` |
| Pujas | `GET/POST /api/pujas`, `GET/PUT/DELETE /api/pujas/[id]` | `?slug=`, `?active=` |
| PujaItems | `GET/POST /api/puja-items`, `GET/PUT/DELETE /api/puja-items/[id]` | `?pujaId=` |
| Pandits | `GET/POST /api/pandits`, `GET/PUT/DELETE /api/pandits/[id]` | `?active=` |
| PujaPandits | `GET/POST /api/puja-pandits`, `GET/PUT/DELETE /api/puja-pandits/[id]` | `?pujaId=`, `?panditId=` |
| Reviews | `GET/POST /api/reviews`, `GET/PUT/DELETE /api/reviews/[id]` | `?userId=`, `?productId=` |
| Coupons | `GET/POST /api/coupons`, `GET/PUT/DELETE /api/coupons/[id]` | `?active=`, `?code=` |
| Addresses | `GET/POST /api/addresses`, `GET/PUT/DELETE /api/addresses/[id]` | `?userId=` |
| Orders | `GET/POST /api/orders`, `GET/PUT/DELETE /api/orders/[id]` | `?userId=`, `?status=` |
| OrderItems | `GET/POST /api/order-items`, `GET/PUT/DELETE /api/order-items/[id]` | `?orderId=` |
| Banners | `GET/POST /api/banners`, `GET/PUT/DELETE /api/banners/[id]` | `?active=` |
| Wishlist | `GET/POST /api/wishlist`, `GET/PUT/DELETE /api/wishlist/[id]` | `?userId=` |
| SupportTickets | `GET/POST /api/support-tickets`, `GET/PUT/DELETE /api/support-tickets/[id]` | `?userId=`, `?status=` |

### pgAdmin Connection Guide
To connect pgAdmin to local development PostgreSQL:

1. Start local Supabase: `npx supabase start` (runs PostgreSQL on port 54322)
2. Open pgAdmin → Add New Server
3. Fill in:
   - **Name**: `Sajjan Mart Local`
   - **Host**: `localhost`
   - **Port**: `54322`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: `postgres`
4. Save — you'll see all tables under `public` schema

> Tables are created by SQL migrations (`supabase/migrations/`). Run them directly on your PostgreSQL instance via pgAdmin or `psql`.

## 2026-07-22: Supabase removed, NextAuth.js auth, Prisma-based data layer

### Supabase Removal
- **Removed** `@supabase/supabase-js` dependency — no more Supabase anywhere in the codebase
- Rewrote `lib/supabase/server.ts` — now wraps **Prisma** queries (same API shape, no Supabase)
- Rewrote `lib/supabase/client.ts` — now calls **internal API routes** via `fetch` (same API shape, no Supabase)
- Removed all Supabase auth calls (`supabase.auth.*`) — replaced with NextAuth.js
- Removed Supabase-specific env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — only `DATABASE_URL` needed

### NextAuth.js Authentication
- Installed `next-auth@4`, `@auth/prisma-adapter`, `bcryptjs`
- Created `lib/auth.ts` — NextAuth config with Prisma adapter + CredentialsProvider
- Created `app/api/auth/[...nextauth]/route.ts` — auth API route (login, session, etc.)
- Created `app/api/auth/signup/route.ts` — registration endpoint (creates profile with hashed password)
- Created `app/api/auth/reset-password/route.ts` — password reset request
- Created `app/api/auth/update-password/route.ts` — password update (authenticated)
- Created `components/providers/session-provider.tsx` — wraps NextAuth SessionProvider
- Rewrote `components/providers/auth-provider.tsx` — now uses NextAuth `useSession` + fetch profile from API
- Updated `app/layout.tsx` — wraps app in `<SessionProvider>` + `<AuthProvider>`
- Updated `app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` — all use NextAuth/API instead of Supabase auth

### Prisma Schema Updates
- Added `password` and `emailVerified` fields to Profile model
- Added `Account`, `Session`, `VerificationToken` models for NextAuth compatibility

### Database Migrations
- Prisma schema (`prisma/schema.prisma`) is the source of truth
- Use `npx prisma db push` to sync schema to local PostgreSQL
- Use `npx prisma studio` for visual database management
- Use pgAdmin connected to `localhost:54322` (local PostgreSQL) for manual queries

### pgAdmin Connection (Updated)
Local PostgreSQL runs independently (no Supabase required):
1. Install PostgreSQL locally or run via Docker
2. Update `DATABASE_URL` in `.env.development`
3. Open pgAdmin → Register Server:
   - **Host**: `localhost`
   - **Port**: `5432` (default PostgreSQL) or `54322` (Supabase-managed PostgreSQL)
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: `postgres`
4. Run SQL migrations from `supabase/migrations/` on your PostgreSQL instance

## 2026-07-24: NextAuth removed, JWT auth added

### NextAuth Removal
- **Removed** `next-auth@4` and `@auth/prisma-adapter` packages
- **Removed** `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `components/providers/session-provider.tsx`
- **Removed** `SessionProvider` from `app/layout.tsx`
- **Removed** `NEXTAUTH_URL`, `NEXTAUTH_SECRET` env vars — now uses `JWT_SECRET`

### JWT Authentication
- Installed `jsonwebtoken` + `@types/jsonwebtoken`
- Created `lib/jwt.ts` — `signToken()`, `verifyToken()` (7-day expiry)
- Created `app/api/auth/login/route.ts` — validates credentials, returns JWT in cookie
- Created `app/api/auth/me/route.ts` — verifies JWT from cookie, returns current user
- Created `app/api/auth/logout/route.ts` — clears token cookie
- Updated `app/api/auth/update-password/route.ts` — uses JWT instead of NextAuth session
- Rewrote `components/providers/auth-provider.tsx` — stores user in state, calls `/api/auth/me` on load
- Updated `app/layout.tsx` — removed `SessionProvider`, kept `AuthProvider`
- Updated `app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx` — use JWT-based APIs
- Added `JWT_SECRET` to both `.env.development` and `.env.production`
