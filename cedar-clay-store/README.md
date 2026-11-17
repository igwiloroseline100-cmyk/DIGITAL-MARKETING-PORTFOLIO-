# Cedar & Clay — E-commerce storefront prototype

**Portfolio demo:** The brand, products, prices and descriptions are fictional. No real products, orders or payments are offered.

## What is implemented

- Multi-page HTML: Home, Shop, Cart, Demo Checkout, About, Contact, plus 16 separate product detail pages
- Semantic navigation, accessible labels, responsive layouts and mobile menu
- 28 built-in sample products: 16 static detail pages plus 12 additional items with a shared dynamic detail template
- Horizontally scrollable featured product rail and vertically browsable shop with progressive reveal as you scroll
- Browser-side search, category filters and sort controls
- Add-to-cart from shop cards and product pages
- Quantity changes, item removal and recalculated totals
- Browser-local cart persistence using localStorage (with an in-memory fallback)
- Floating quick-bag button available on every page, including mobile; opens an accessible side drawer on request with quantity, removal and running subtotal. Adding an item no longer interrupts browsing
- Checkout review offers bank transfer, pay on delivery and card payment previews. Sample bank choices and a clearly non-payable account-number placeholder are shown; the final button remains disabled. A clearly labelled, nonfunctional order-status and shipping-notification journey shows what a live backend would eventually support
- Contact form with browser validation; no message transmission or storage
- Descriptive page titles, meta descriptions, relative internal links and canonical URLs

**Not yet implemented:** a database, authentication, inventory system, payment processing, secure order handling, delivery pricing or real business contact forms. All pages use `noindex,follow` until the demo inventory is replaced with real listings and the launch configuration is reviewed.

## Site structure

- `index.html` — shop homepage
- `shop.html` — product catalogue, search, categories and sorting
- `products/*.html` — 16 static product detail pages
- `product-preview.html?id=…` — dynamic detail view for added sample items and local drafts
- `catalog-studio.html` — browser-local catalogue editor demonstration; not authenticated, not published globally
- `cart.html` — persistent demo cart
- `checkout.html` — payment-method previews for bank transfer, pay on delivery, card; no payment connection
- `about.html` — brand story / project transparency
- `contact.html` — locally validated demonstration form
- `assets/styles.css` — shared design system and responsive rules
- `assets/catalog.js` — 28 built-in sample products and read-only merge of up to 16 local drafts
- `assets/studio.js` — local demo editor: create, edit, remove, compress JPG photo and export JSON
- `assets/main.js` — client-side behaviour
- `tests/smoke.mjs` — automated file, link, metadata and syntax checks
- `tests/interaction.mjs` — simulated cart and payment interaction checks

## Run locally

Serve the folder with a basic local HTTP server, for example from inside `cedar-clay-store/`:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`.

Run automated checks from the same folder:

```sh
node --test tests/smoke.mjs
```

## Manual acceptance test

1. Open Shop. Search for `mug` → exactly one card should remain.
2. Clear search. Filter `Desk` → seven cards should match. Scroll to reveal the rest.
3. Sort by price low to high. Check the prices ascend.
4. Open a product detail page. Change quantity to 2 and add to bag; the cart should update without opening automatically.
5. Reload the page in the same browser. Bag count should remain 2.
6. In Bag, increase the mug quantity to 3. Subtotal should be ₦28,500 if only the mug is present.
7. Use the floating bag button from any page to open it manually; check its count, subtotal, increment/decrement and remove buttons.
8. Open checkout and select **View payment options**, choose Bank transfer, pick a sample bank and inspect the **non-payable** account placeholder. Confirm the final Pay button cannot be clicked.
9. Change to Pay on delivery and then Card. Each shows a distinct preview, but no payment or delivery proceeds, and the cart stays unchanged.
10. On mobile width, open and close the menu and floating bag.
11. On Contact, try an invalid email and a too-short message to check validation.
12. Repeat in private browsing. Cart storage should be separate.

## Publishing

The current review version is hosted inside a project folder of the existing portfolio's GitHub Pages repository. The store uses relative navigation and resource links so it can be moved into a dedicated repository later. When moving, update the canonical URLs to the new base URL and repeat the tests. Do not describe this prototype as a production store or claim payment/order features.

## Technical decisions

Static product pages make the HTML available without client-side rendering for titles, descriptions and links. One shared catalogue source handles the JavaScript cart. Prices use NGN formatting, matching the mock listings. Frontend persistence is local and is not an order database.

## Browser-only editor boundaries and future backend

The publicly accessible `catalog-studio.html` page is a **UI prototype**, not a private admin route. It stores up to 16 local product drafts in the owner's current browser only. Other visitors, other browsers and other devices **will not** see these additions. There are no passwords, owner roles or secure server writes. Browser data can be cleared; use Export JSON to retain a copy. Uploaded JPG/PNG/WebP sample photos are processed to small JPEGs and stored locally within the browser's quota.

The real production architecture should be an authenticated owner dashboard, database-managed products, secure image storage and backend policies enforcing permissions (e.g. managed auth + product records + image objects). Never put database service-role credentials or GitHub access tokens into front-end JavaScript. The UI must connect to a properly authenticated backend before describing it as a live multi-user catalogue.

Static seed detail pages exist for SEO demonstration; new local products use a JavaScript-rendered demo detail template. Production catalogue SEO should be reviewed separately when actual indexed products exist.

## Bulk quantities (demo)

Cart quantities can be typed directly (for example 50), or adjusted with + and −. The demo supports whole numbers from **1 to 999** per product and updates counts, subtotals and the checkout preview. This does not verify available stock: in a real ecommerce backend, inventory and purchase limits must be enforced server-side.
