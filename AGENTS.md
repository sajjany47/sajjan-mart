# AGENTS.md — Project Change Log

## 2026-09-09: Razorpay payments (replaces Cashfree) — backend-owned orders + server-side signature verification + auto-refunds

- **Goal**: move Sajjan Mart from Cashfree to Razorpay. Order creation, payment confirmation, failed-payment recording and refunds are all backend-owned; secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) never leave the server; only the public `RAZORPAY_KEY_ID` is exposed to the Checkout UI.
- **Schema**: `Order` gained `refundStatus String?`, `razorpayOrderId String?`, `razorpayPaymentId String?`, `razorpaySignature String?`, `paidAt DateTime?`, `paymentFailureReason String?` (pushed via `prisma db push --accept-data-loss` + regenerated client — dev server restart needed to unlock the query-engine DLL).
- **`lib/razorpay.ts`** (server-only): `razorpayKeyId()`, `razorpayConfigured()`, lazy `getRazorpay()`, `toPaise()`, `createRazorpayOrder(₹, receipt≤40)`, `fetchRazorpayPayment()`, timing-safe `verifyPaymentSignature(orderId|paymentId HMAC with key secret)`, `createRazorpayRefund(paymentId, ₹)`, `verifyWebhookSignature()` (refuses when no webhook secret). Type imports come from `razorpay/dist/types/{orders,payments,refunds}` (namespace types; the SDK package is `export =`).
- **`POST /api/orders`**: creates the Razorpay order BEFORE the Prisma insert (a payment-init failure can never orphan a DB row); stores `razorpay_order_id`; `paymentStatus` is always server-owned. Demo fallback: when `paymentMethod='razorpay'` but `razorpayConfigured()==false` (or total is 0) the order is marked `paid` and the response carries `{ key_id:null, demo_mode:true, razorpay_order_id:null }` so the storefront works without keys. COD stays `pending`.
- **`POST /api/payments/verify`**: HMAC signature gate first, then (only when keys configured) a `payments.fetch` capture double-check. Marks `paid` + `paidAt` + `razorpay_payment_id` + `razorpay_signature`; replays of the same payment id are idempotent; signature mismatch → `paymentStatus='failed'`. Sends the payment-success mail.
- **`POST /api/payments/failed`**: records `paymentStatus='failed'` + failure reason, but only while the order is still pending (never clobbers a concurrent capture).
- **`POST /api/webhooks/razorpay`** (raw body + `x-razorpay-signature`): `payment.captured` marks paid (+ success mail), `payment.failed` records failure, `refund.processed` sets `refundStatus='processed'`, bumps `refundedAmount` and flips `paymentStatus='refunded'` on full repayment. Orders are matched with `findFirst` (the razorpay ids are not unique columns). Unhandled events ack cleanly.
- **`lib/razorpay-refunds.ts`**: `initiateRefundIfNeeded(order)` — idempotent auto-refund for genuinely paid orders: guards on `paymentStatus='paid'`, `razorpayPaymentId` present, `refundStatus!=='pending'`, `refund_pending>0`; marks `refundStatus='failed'` on API error; in-flight `refund.status!=='failed'` → `refundedAmount+=refund_pending`, `paymentStatus='refunded'` on full cancels. Wired into admin direct-cancel (`PUT /api/orders/[id]`), cancel-approve and per-item cancel (`process-item`) routes; notification mails now use the post-refund refreshed order.
- **`lib/order-refunds.ts`**: `buildRefundUpdate` now only sets `status='cancelled'` for fully-cancelled orders — money bookkeeping (`refundedAmount`/`refundId`/`refundStatus`/`paymentStatus`) is owned solely by the refund initiator.
- **Checkout UI** (`components/store/checkout-client.tsx`): Razorpay Checkout script lazy-loaded via idempotent `loadRazorpayScript()`; on razorpay order created, `new Razorpay({key, amount, currency:'INR', order_id, prefill, theme, handler, modal:{ondismiss}})` opens; `handler` posts to `/api/payments/verify`; `payment.failed` posts to `/api/payments/failed`; `ondismiss` treats it as pending payment. `demo_mode` skips the modal (instant paid). Cart always cleared + redirect to `/account/orders/<id>` regardless of settle outcome. Payment note copy is method-aware (COD = pay on arrival; Razorpay = secure gateway line).
- **Cashfree removed**: `PaymentMethod = 'cod' | 'razorpay'` (`lib/types.ts`), `PAYMENT_METHODS` now razorpay-only for online/both (`lib/store-config-utils.ts`), admin settings descriptions, footer "COD · Razorpay" line, `CASHFREE_APP_ID`/`CASHFREE_SECRET_KEY` deleted from both env files. Note: the SQL CHECK constraint still allows `'cashfree'` (`supabase/migrations/20260718183000_001_initial_schema.sql:359`) — kept, not dropped.
- **Labels** (`lib/format.ts`): `paymentStatusLabel` (Pending/Paid/Failed/Refunded) and `refundStatusLabel` (initiated/refunded/failed). Admin orders footer + expanded refund panel and customer order detail (`app/account/orders/[id]`) now show payment/refund status chips + the Razorpay payment id. `Order` client type extended with the six new Prisma fields.
- **Verified**: `npx tsc --noEmit` clean, `npm run lint` clean (only pre-existing exhaustive-deps warnings), dev server restarted on :3000, HTTP smoke tests — razorpay demo order → `payment_status=paid`, `demo_mode=true`, no keys; COD → `payment_status=pending`; `/api/payments/verify` rejects a bogus signature (400). Test data cleaned up.

## 2026-09-09: Puja detail page redesign — item rows with product images (display-only)

- **Product images on puja items**: `app/puja/[slug]/page.tsx` (`getPujaData`) now fetches `products.product_images` for each `puja_items.product_id` and attaches the first (lowest `sort_order`) image URL to the item as `image`. Display-only; no cart/pricing logic changed.
- **Item rows redesigned** (`components/store/puja-detail-client.tsx`): items render as a cohesive card list per category (`divide-y` rounded container). Each row: 48/56px thumbnail (graceful fallback to a per-category tinted icon tile via `ItemThumb` when the product has no image or the image 404s — seeded `/images/puja-items/*.jpg` files are absent), name (wrapping, not truncated, to avoid mobile overflow) + `₹price / unit`, a custom round checkbox tile in the category colour, and qty stepper + line total when selected. Category headers use icon chips (`Sparkles`/`Package`/`HandHeart`) with dark-mode variants.
- **Hero**: banner image with gradient overlay title (falls back to a soft gradient tile when `puja.image_url` is empty).
- Fixed mobile overflow on `/puja/*`: item-name `truncate` made long rows' min-content width (451px) blow out the page on 440px viewports; letting names wrap yields 0px horizontal overflow and columns of min-content 364/267px.
- Verified live: 95 rows render, 74 real images, 0 broken images, toggle/qty/cart math correct (Surya Dev Photo +₹130 → total ₹1,475, reverted), defaults unchanged (20 items ₹1,345 for Chhath Puja), `tsc` clean, ESLint clean.

## 2026-09-08: Puja Samagri restructure (one product per item, per-Puja category) + puja sort & richer puja-items API

- **Data model**: `PujaItem` gained `category String @default("basic")` (`// basic | special | recommended`) — the category lives on the Puja↔Product join row, so the *same* product can be `basic` in one Puja and `recommended` in another. Schema pushed to Neon (`npm run prisma:push -- --accept-data-loss`), `lib/types.ts` `PujaItem` updated with `category`, Prisma client regenerated (requires dev server restart to unblock the query-engine DLL swap).
- **Full re-import**: `prisma/import-puja-samagri.ts` (`npm run import:puja-samagri`) is an intentionally destructive clean-rebuild — deletes ALL existing `puja_samagri` products + their `puja_items` links, then re-imports from `new-puja-item.json` (46 Pujas). One product per **normalized** name (`Rice / Atap Rice` == `Rice/Atap Rice`, dedupe map), assigned to every Puja that lists it with that Puja's category, `base_price` recomputed per Puja (Σ price × qty). Result: **521 unique products, 3211 assignments** (basic=841 / special=864 / recommended=1506), Durga Puja 117 items ₹13395, 0 duplicates, 0 failures. (Note: there is also an Excel-import path in `lib/puja-excel-import.ts` — that one is unrelated to `puja_samagri` product structure and remains untouched.)
- **Richer `GET /api/puja-items`**: now accepts `?grouped=true` → `{ items: { basic[], special[], recommended[] } }` (each item includes `puja` + `product`), `?productId=<id>` → the puja_item rows for that product (used by the admin add/edit form), and `?productId=<id>&pujasOnly=true` → deduplicated list of Pujas that use that product (sorted by name, `distinct` on `pujaId`). Single-word `category` stays `category` in `jsonResponse` snake_case output.
- **Admin Puja tab** (`app/admin/products/page.tsx`): "Item Category" badge column (deduped values) and an **Assigned Pujas** count button that opens a dialog listing the assigned pujas with their category badge (clicking any product's count). Add/Edit form gained a **Puja Assignments** section (per-assignment Puja select + category select + remove, "Add Puja" button; edit prefills assigned pujas by fetching `?productId=` puja_item rows); create/edit syncs `puja_items` (delete+reinsert on edit), requires ≥1 assignment, valid category, no duplicate Puja.
- **Admin Pujas page sort** (`app/api/pujas/route.ts` + `app/admin/pujas/page.tsx`): `?sort=` supports `image-missing` (default), `name`/`name-asc`, `name-desc`, `price-asc`, `price-desc`, `newest`, `oldest`; toolbar dropdown on `/admin/pujas`.
- Verified: 0 duplicate puja_samagri names, Rice/Atap Rice exists once with 45 Puja assignments, grouped Durga Puja = 22/36/59 (basic/special/recommended), `?productId=` returns 45 Pujas, `/admin/products` renders 200, `tsc --noEmit` clean, ESLint clean (1 pre-existing exhaustive-deps warning), Prisma client fully regenerated + dev server restarted.

## 2026-09-04: Fix Excel import isolation between products and puja packages

- **Separated product catalog import from puja package import**: `IMPORTABLE_TYPES` in `/api/admin/import/product/preview` and `/api/admin/import/product` extended to include `puja_samagri`.
- **`ProductImportDialog`** (`components/admin/product-import-dialog.tsx`) gained an explicit `isPujaPackageImport?: boolean` prop (default `false`). On `/admin/products` (all tabs: Food, Puja, Natural, General), Excel upload imports single-sheet product items into the `products` table only. On `/admin/pujas` (`app/admin/pujas/page.tsx`), `isPujaPackageImport={true}` invokes the 2-sheet Puja Package + Puja Items flow (`/api/admin/import/puja`).
- **Robust sheet detection in `lib/puja-excel-import.ts`**: `detectSheetKind` checks for price columns (`PRICE_HEADERS`) to classify product catalog sheets as `'items'` regardless of sheet name, refined `ITEMS_HEADERS` to prevent column headers like "Item Name" / "Product Name" from misclassifying catalog sheets as package sheets.
- **Database cleaned**: Removed 225 accidental product records created in `pujas` table, restoring `pujas` table count to 59 genuine puja packages.

## 2026-09-03: Excel upload extended to all product types

- The 3-step import wizard is now available on **every tab** of `/admin/products` (Food, Puja, Natural, General) and on `/admin/pujas`. `PujaImportDialog` generalized into `ProductImportDialog` (`components/admin/product-import-dialog.tsx`) keyed by `productType`.
- **Puja** tab keeps the two-sheet flow (Puja Items + Pujas). **Food / Natural / General** tabs import a single-sheet product catalog, upserting products **by name within that product type** (found → update, missing → insert). Demo download + review/edit/delete + result steps identical.
- New per-type APIs: `POST /api/admin/import/product/preview` (parse .xlsx for a type, read-only existing-name detection, no writes) and `POST /api/admin/import/product` (apply reviewed JSON rows). Apply logic in `lib/product-import-apply.ts` (category per type via `CATEGORY_SLUG_BY_TYPE`, per-type chip lists in `lib/puja-import-types.ts`, `purchase = 60%` default, food gets `food_type` default Veg + stock disabled, natural/general default `piece` stock 100, products start `isFeatured: false`).
- `parseCatalogWorkbook(buffer, type)` added to the server parser (single-sheet items-only, optional **Food Type** column: Veg / Non Veg / Egg aliases); existing puja two-sheet parser unchanged.
- Demo templates: `GET /api/admin/export/puja-samagri?type=<type>&template=1` returns headers + example rows per type (food template includes a Food Type column); the live food export also gained a Food Type column for round-trips.
- Verified: 13/13 catalog parser assertions (per-type chips by label/slug, food-type aliases, two-sheet puja intact), `tsc` clean for touched files, ESLint clean, product preview/apply + template endpoints → 401 without auth, admin pages render 200.

## 2026-09-03: 3-step puja Excel import wizard (+ preview/demo APIs)

- `PujaImportDialog` (`components/admin/puja-import-dialog.tsx`) replaces the one-shot upload button on `/admin/pujas` and the Puja tab of `/admin/products`. Dialog flow: **(1) Download & Upload** — downloads `puja-import-demo.xlsx` (`GET /api/admin/export/pujas?template=1`, headers + clearly-marked example rows) with instructions (never change header row), then chooses the `.xlsx`; **(2) Review & Edit** — parsed rows shown per sheet with Update-existing/Add-new badges (preview does read-only name lookups), inline edit for every field (name, price, category select, description, image URLs, active toggle; puja items as comma-separated text), per-row delete, row/global warnings from the parse; **(3) Result** — "Data imported successfully" with counts (items/pujas added·updated, links, images) and warnings list.
- API split: `POST /api/admin/import/puja/preview` parses the uploaded workbook and returns editable JSON rows — **no DB writes**; `POST /api/admin/import/puja` now accepts the reviewed JSON rows `{ items, pujas }` and applies them (no longer reads multipart files directly). Upsert logic extracted to `lib/puja-import-apply.ts` (`applyPujaImport`).
- Types/helpers split so the client wizard can import them: `lib/puja-import-types.ts` (client-safe: `PUJA_CHIP_LABELS`, `ParsedPujaItem/ParsedPuja` types, `parseNumber/parseBool/parseItemsCell/resolveChip/splitImageUrls`) vs server-only `lib/puja-excel-import.ts` (workbook parsing).
- Verified: parser smoke test after split (9/9 assertions), `tsc` clean for touched files, ESLint clean, all three guarded endpoints → 401 without auth, admin pages render 200.

## 2026-09-03: Admin Excel import for pujas & puja samagri (upsert by name)

- New admin-only endpoint `POST /api/admin/import/puja` (`exceljs`): accepts a two-sheet `.xlsx` and upserts **puja samagri products** and **pujas** by name (case-insensitive) — name found → update, not found → insert, matching the app's seeded conventions (`puja-<slug>` product slugs, `piece` quantity/stock defaults, purchase = 60% of sales, `metadata.source='admin_excel_import'`, missing category → `other` with a warning).
- Sheet **"Puja Items"** columns: `Item Name`, `Price (Rs)`, `Purchase Price (Rs)`, `Description`, `Image URL` (comma-separated, only missing images added), `Category` (chip label like "Coconut (Nariyal)" or slug), `Is Active`. Header matching is tolerant (parens/units stripped, aliases like `Sales Price`/`Rate`/`MRP` accepted).
- Sheet **"Pujas"** columns: `Puja Name`, `Description`, `Image URL`, `Is Active`, `Items` (comma-separated names, `2 x Coconut` / `Coconut x 2` quantity prefixes). Existing puja's item list is rebuilt like the admin dialog (`deleteMany` + re-insert) and `base_price` recomputed as Σ price × qty. Items referenced but missing from the DB are auto-created at ₹0 with a warning.
- Parser lives in `lib/puja-excel-import.ts` (pure, no DB) so it is unit-testable; sheet kind auto-detected by name then headers, `Item`/`Puja` sheet order in the file does not matter. Files > 15 MB or non-`.xlsx` rejected with 400; auth 401/403 via `requireAdmin`.
- UI: reusable `ExcelImportButton` (`components/admin/excel-import-button.tsx`) posts the workbook and toasts a summary (created/updated/linked counts + first warning). Wired into `app/admin/pujas/page.tsx` toolbar and `app/admin/products/page.tsx` toolbar (shown only on the **Puja** tab).
- New admin-only `GET /api/admin/export/pujas`: builds a round-trip workbook for the same import — sheet **"Pujas"** (Puja Name, Description, Image URL, Is Active, Base Price (Rs), Items as `2 x Coconut`-style comma list in sort order, resolved via the linked product name) and sheet **"Puja Items"** (full samagri catalog with chip labels from the shared `PUJA_CHIP_LABELS` map). Styled/frozen header matching the product export; downloads `pujas.xlsx`.
- "Export Excel" button added to `app/admin/pujas/page.tsx` toolbar (beside Upload Excel + Add), same blob-download flow as the products page — export → edit in Excel → upload back.
- Verified: 26 parser assertions via throwaway `prisma/_test-parser.ts` (headers, ₹/comma prices, chip label+slug mapping, Yes/No/true bools, qty prefixes, unknown-category warning; deleted after), `tsc` clean for touched files, ESLint clean, unauthenticated import POST → 401 / export GET → 401.

## 2026-08-30: Admin product Excel export

- New admin-only endpoint `GET /api/admin/export/puja-samagri?type=<productType>` (`exceljs` added): returns a styled `.xlsx` for the requested product type (puja_samagri / food / natural / general) with 28 columns — name, slug, description, category/subcategory/brand names, product chip label, purchase/sales/final price, discount, quantity/type, stock/type, gender, rating, review count, all 5 status flags, sort order, image URLs, linked festivals (from `pujaItems`), created/updated timestamps. Frozen header row, orange fill, auto widths.
- "Export Excel" button in `app/admin/products/page.tsx` toolbar (per active tab) downloads `puja-samagri.xlsx` etc.; guards: 401 no token, 403 non-admin.
- Verified 12/12 e2e assertions (auth guards, xlsx magic bytes, worksheet/28 columns, header, row count matches DB).

## 2026-08-30: Admin products sorting (image-missing first + name sorts)

- `GET /api/products` supports new `sort` values: `image-missing` (products with no `product_images` first, then name A–Z), `name-asc` / `name-desc` / `name` (case-insensitive alphabetical), `oldest`. Name + image sorts use a case-insensitive JS sort after fetch (Prisma 5.22 has no `mode` in orderBy). Existing `price-asc/desc`, `rating`, `newest` unchanged.
- `app/admin/products/page.tsx`: sort dropdown in the toolbar — "Image missing first" (default), Name A–Z / Z–A, Newest / Oldest — passed to the API via `.eq('sort', …)`; load effect re-runs on change.
- Verified 6/6 e2e (zero-image-first monotonic counts, case-insensitive A–Z, Z–A reverse, newest/oldest).

## 2026-08-30: Food orders highlighted on admin Orders screen

- `app/api/orders/route.ts` GET now includes each item's `product.product_type`; POST auto-tags food order items `item_type='food'` (one product-type lookup by id) so the flag survives later product deletion.
- Admin Orders (`app/admin/orders/page.tsx`): orders still containing an active food item get an orange border/ring, a "⚡ FOOD" badge next to the order number, an "⚡ Food items — deliver ASAP" note in the footer strip, and are sorted to the top of every tab (New/Processing/Dispatch/Cancel Request/Completed) — food-first, then newest first.

## 2026-08-30: Admin Users module + active/inactive account gating

- `Profile` gained `isActive Boolean @default(true) @map("is_active")` (pushed via `prisma db push --skip-generate --accept-data-loss`, which also dropped unused legacy `profiles.refresh_token` column + `device_tokens` table).
- **Deactivated accounts are locked out**: `/api/auth/login` returns 403 ("This account has been deactivated..."), `/api/auth/me` returns `user: null` / 401, and `POST /api/orders` rejects with 403. Admins can't be deactivated (server-side guard) so the panel can't be locked out.
- New admin-only API:
  - `GET /api/admin/users` — searchable (`q` name/email/phone, `role` filter), returns every profile + `_count` of orders/support tickets, newest first.
  - `PUT /api/admin/users` — toggles `is_active` (body `{ id, is_active }`; `parseBody` snake→camel so camelCase works too; flags `null` for fields the requester must not see — actually returns the sanitized profile, password always stripped).
  - `GET /api/admin/users/[id]` — profile + up to 100 orders (with `amounts` from `computeOrderAmounts`) + support tickets (with linked order) for the per-user drilldown.
- Admin routes use `requireAdmin` (JWT `access_token` cookie, role check) — non-admin tokens get 403.
- New admin pages: `app/admin/users/page.tsx` ("Users" in sidebar nav, `UserRound` icon) — searchable datatable with role badge, order/ticket counts, Active/Inactive badge + Activate/Deactivate buttons (hidden for admins); `app/admin/users/[id]/page.tsx` — profile header, stat cards, inactive-warning banner, orders panel (shows updated total + "X cancelled" when the order has cancellations) and tickets panel.
- Verified 19/19 e2e assertions via a throwaway HTTP script (`prisma/_test-users.ts`, deleted): admin list/401/403 guards, admin self-deactivate blocked, login blocked while inactive and restored after reactivation, order placement blocked while inactive, detail payload shape (order amounts + tickets).

## 2026-08-16: Order & ticket email notifications (Nodemailer)

- New `lib/mailer.ts`: lazy nodemailer transporter from `SMTP_*` env vars, `ADMIN_EMAIL` (default `sajjany47@gmail.com`), and fire-and-forget `sendMailSafe` (failures are logged, never thrown — order/ticket APIs can't break because of mail).
- Mails wired into the API layer:
  - `POST /api/orders` → order-placed HTML mail to **customer + admin** (items, totals, payment, delivery address).
  - `PUT /api/orders/[id]` (admin) → status-change mail to customer for every transition (confirmed/processing/packed/shipped/delivered/cancelled/refunded; admin cancelling directly sends "order cancelled").
  - `POST /api/orders/[id]/cancel` (user cancel request) → **admin** gets a CANCEL REQUEST alert with requested item names.
  - `.../cancel/approve` → customer gets "cancellation approved" (cancelled items, refund amount, full vs partial note).
  - `.../cancel/reject` → customer gets "request declined" and order continues.
  - `POST /api/support-tickets` → **admin** gets only that ticket's details (ticket no, subject, issue text, linked order).
- Env: `.env.development` + `.env.production` SMTP fixed from Ethereal to `smtp.gmail.com:465 secure`, added `ADMIN_EMAIL`. **Gmail login currently fails (`535 BadCredentials`)** — `SMTP_PASSWORD` must be a real 16-char Gmail App Password (Google Account → Security → 2-Step Verification → App passwords). Until then all mails just log errors.

## 2026-08-16: Per-festival curated puja samagri from puja-item.ts

- `puja-item.ts` (repo root) now exports all 14 festival consts (`BirthdayItems`, `newYearPartyItems`, ... `marriageAnniversaryItems`) plus a `FESTIVAL_ITEMS: Record<slug, PujaListItem[]>` map keyed to the festival slugs in the DB.
- New idempotent importer `prisma/import-puja-items.ts` (run via `npm run import:puja-items`): deletes ALL old puja_samagri products + their old `puja_items` links, inserts **225 unique curated products** (deduped by item name across festivals — same items shared across festivals become ONE product, `puja-<slug>` slug), stores the local `/images/puja/*.webp` image only if the file actually exists (none do yet — ProductCard falls back to the placeholder), then links every festival to its curated items via `puja_items` (name, price, sortOrder) and recomputes `base_price` per festival (sum of item prices).
- Verified: 14 festivals, 511 puja item links, 0 orphan/`productId: null` links, counts match each `FESTIVAL_ITEMS` entry (e.g. Durga Puja 41 items ₹6250, Chhath Puja 50 items ₹5360, Birthday 19 items ₹2615).
- `prisma/import-festivals.ts` step 3 updated — it now rebuilds `puja_items` from `FESTIVAL_ITEMS` (not "link every product to every festival"), so running `import:festivals` after `import:puja-items` keeps the curated lists intact.
- `prisma/seed.ts` puja section reworked: hardcoded 20-product `pujaSamagriProducts` array + 20 `imageMap` entries replaced with a deduped build from `FESTIVAL_ITEMS` and per-festival linking (fresh `npm run seed` matches the importers). No storefront changes — `/puja/[slug]`, `/category/puja-samagri`, cart, checkout and admin pick the curated rows up automatically.

## 2026-08-15: Zomato restaurant menu imported into the food section

- `resturantMenu.json` (Zomato menu dump, `menuResponse.categoryWrappers` + `catalogueWrappers`) now seeds **71 real dishes** into the `products` table as managed food products. These flow through the existing food category page (`/category/food`), cart, checkout, search and filters — no new storefront code needed.
- New idempotent importer `prisma/import-zomato-menu.ts` (run via `npm run import:zomato`): parses the JSON, maps each dish to a `Product` (Zomato images/media → `product_images`, price → `sales_price`, `veg`/`non-veg`/`egg` catalogue tags → `food_type`, `servingSizeV2` → `quantity`/`quantity_type='gram'`, original data kept in `metadata` incl. `zomato_catalogue_id`, `dish_attributes`, `tags`, `serving_size`). Dishes are matched by `metadata.zomato_catalogue_id`, so re-runs update in place instead of duplicating.
- Zomato categories mapped to `product_category` chips: Pizza → `pizza` (13), Momos → `momos` (15), Maggi → `maggi` (4), Sandwiches → `sandwiches` (6), Breakfast → `breakfast` (14), Snacks → `snacks` (10), Dinner Special Menu → `dinner_special_menu` (9). Cross-listed dishes (e.g. All Time Favourite) resolve by priority order. `app/category/[slug]/page.tsx` `FOOD_CATEGORIES` chip list extended with Maggi / Sandwiches / Dinner Special.
- The topping catalogue entries (Cheese/Chicken/Paneer/Corn/Onion/Tomato/Capsicum/Boiled+Fried Egg/Maggi Masala/Haldi/Sugar/Badam) become **Add-On items** (`Extra X`, `add_on_items`), auto-linked to matching categories via `product_add_ons` (`ADDON_LINK_RULES`).
- 15 junk entries (Candles, Cake Knife, party props, "On the cake" etc.) with no catalogueId/price are skipped.
- **Featured-food ordering**: `Product` gained `sort_order Int @default(0)` — the food page now leads with the attractive dishes the user wants to see first (not the newest imports). Import assigns `CATEGORY_SORT_ORDER` (Momos=1, Pizza=2, Maggi=3, Sandwiches=10, Breakfast=11, Snacks=12, Dinner Special=13) and pushes all non-zomato food products to `NON_ZOMATO_SORT_ORDER=100` so milk/seed items fall behind the menu. `app/api/products/route.ts` default order changed to `[{ sortOrder: 'asc' }, { createdAt: 'desc' }]` (must be the **array** form — a single `orderBy` object throws). `FOOD_CATEGORIES` chips in `app/category/[slug]/page.tsx` reordered: Momos, Pizza, Maggi, Sandwiches, Breakfast, Snacks, Dinner Special.

## 2026-08-15: Natural products replaced with spice/kitchen lineup

- New idempotent importer `prisma/import-natural-products.ts` (run via `npm run import:natural`): deletes ALL existing `productType='natural'` rows, then inserts the **11 product list** (Mustard Oil, Haldi Powder, Garam Masala Powder, Garam Masala Gota, Dhaniya Powder, Jeera Powder, Lal Mirch Powder, Adrak Lahsun Paste, Kashmiri Mirch Powder, Chicken Preparation Masala, Mutton Preparation Masala) mapped to `product_category` chips (`oil_ghee` for Mustard Oil, the rest `masala_spices`), subcategories `oils`/`spices`, brands `farm-fresh`/`pure-organic`, with pexels images and `metadata.source='natural_products'`.
- `prisma/seed.ts` `naturalProducts` array replaced with the same lineup (slug-based upserts) and imageMap extended; fresh setup via `npm run seed` matches. No storefront change — the existing `/category/natural-products` page, chips, cart and checkout pick the new rows up automatically (verified via API: total 11).

## 2026-08-15: Kolkata festival lineup replaces pujas

- New idempotent importer `prisma/import-festivals.ts` (run via `npm run import:festivals`): deletes ALL existing pujas, then inserts the **14 Kerala... Kolkata festivals** (Durga Puja, Kali Puja, Diwali, Chhath Puja, Poila Boishakh, Saraswati Puja, Lakshmi Puja, Jagaddhatri Puja, Holi, Janmashtami, Christmas, 31st December, Birthday, Marriage Anniversary) as `Puja` rows (slug, description, pexels image, `base_price`).
- After inserting, the importer rebuilds each festival's `puja_items` from the active puja_samagri products (sum of their sales prices → `base_price`, same as seed) and re-links all pandits via `puja_pandits`. So every festival shows the full samagri checklist + pandit options on `/puja/[slug]`.
- `prisma/seed.ts` `pujas` array replaced with the same 14-festival list; fresh `npm run seed` matches. No storefront changes — `/puja` (list + search), `/puja/[slug]` (detail + booking), cart, checkout and admin Pujas pick the new rows up automatically (verified: 14 pujas via API; durga-puja has 20 items + 4 pandits).

## 2026-08-14: Compact product-first category pages + server-side product pagination

- **New shared client `components/store/category-products-client.tsx`** — replaces `ShopClient` + `FoodShopClient` on all four category pages (`/category/food`, `/natural-products`, `/general`, `/puja-samagri`). Product-first layout: navbar → compact category name → horizontally scrollable subcategory chips → search + Filter (mobile drawer) + Sort → product count (“Showing X of Y”) → 2-col grid (mobile) / 4-col + sidebar (desktop) → infinite scroll (IntersectionObserver sentinel auto-loads the next server-side page, no “Load More” button). No hero banner / marketing headers.
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
