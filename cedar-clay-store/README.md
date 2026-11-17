# Cedar & Clay — E-commerce storefront prototype

**Portfolio demo:** The brand, products, prices and descriptions are fictional. No real products, orders or payments are offered.

## What is implemented

- Multi-page HTML: Home, Shop, Cart, Demo Checkout, About, Contact, plus 16 separate product detail pages
- Semantic navigation, accessible labels, responsive layouts and mobile menu
- Static product catalogue with browser-side search, category filters and sort controls
- Add-to-cart from shop cards and product pages
- Quantity changes, item removal and recalculated totals
- Browser-local cart persistence using localStorage (with an in-memory fallback)
- Floating quick-bag button available on every page, including mobile; opens an accessible side drawer on request with quantity, removal and running subtotal. Adding an item no longer interrupts browsing
- Checkout review offers bank transfer, pay on delivery and card payment previews. Sample bank choices and a clearly non-payable account-number placeholder are shown; the final button remains disabled
- Contact form with browser validation; no message transmission or storage
- Descriptive page titles, meta descriptions, relative internal links and canonical URLs

**Not yet implemented:** a database, authentication, inventory system, payment processing, secure order handling, delivery pricing or real business contact forms. All pages use `noindex,follow` until the demo inventory is replaced with real listings and the launch configuration is reviewed.

## Site structure

- `index.html` — shop homepage
- `shop.html` — product catalogue, search, categories and sorting
- `products/*.html` — 16 individual product detail pages
- `cart.html` — persistent demo cart
- `checkout.html` — payment-method previews for bank transfer, pay on delivery, card; no payment connection
- `about.html` — brand story / project transparency
- `contact.html` — locally validated demonstration form
- `assets/styles.css` — shared design system and responsive rules
- `assets/catalog.js` — sample product data
- `assets/main.js` — client-side behaviour
- `tests/smoke.mjs` — automated file, link, metadata and syntax checks

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
2. Clear search. Filter `Desk` → five cards should remain.
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

The first review version is hosted inside a project folder of the existing portfolio's GitHub Pages repository. The store uses relative navigation and resource links so it can be moved into a dedicated repository later. When moving, update the canonical URLs to the new base URL and repeat the tests. Do not describe this prototype as a production store or claim payment/order features.

## Technical decisions

Static product pages make the HTML available without client-side rendering for titles, descriptions and links. One shared catalogue source handles the JavaScript cart. Prices use NGN formatting, matching the mock listings. Frontend persistence is local and is not an order database.
