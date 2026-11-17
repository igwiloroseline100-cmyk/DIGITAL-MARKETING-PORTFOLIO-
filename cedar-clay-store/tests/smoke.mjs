import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const pages = ["index.html", "shop.html", "cart.html", "checkout.html", "about.html", "contact.html", "catalog-studio.html", "product-preview.html", "orders.html", "order-studio.html"];
const productFolder = path.join(root, "products");
const productPages = fs.readdirSync(productFolder).filter(p => p.endsWith(".html")).map(p => "products/" + p);
const allPages = [...pages, ...productPages];

test("all ten main pages and sixteen static detail pages exist", () => {
  assert.equal(pages.length, 10);
  assert.equal(productPages.length, 16);
  for (const page of allPages) assert.ok(fs.existsSync(path.join(root, page)), page);
});

test("every HTML page has an identifiable title, description and conservative indexing settings", () => {
  for (const page of allPages) {
    const html = read(page);
    assert.match(html, /<title>[^<]+<\/title>/, page + " title");
    assert.match(html, /<meta name="description" content="[^"]+"/, page + " description");
    assert.match(html, /<meta name="robots" content="noindex,follow"/, page + " noindex");
    assert.match(html, /<main id="main"(?:\s[^>]*)?>/, page + " main content");
    assert.match(html, /<link rel="canonical" href="https:\/\//, page + " canonical");
  }
});

test("local href and src paths resolve to existing files", () => {
  for (const page of allPages) {
    const html = read(page);
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
    for (const reference of references) {
      if (reference.startsWith("#") || /^[a-z]+:\/\//i.test(reference) || reference.startsWith("mailto:")) continue;
      const target = reference.split("#")[0].split("?")[0];
      if (!target) continue;
      const absolute = path.resolve(path.dirname(path.join(root, page)), target);
      assert.ok(absolute.startsWith(repoRoot + path.sep), "path outside repository: " + page + " -> " + target);
      assert.ok(fs.existsSync(absolute), "missing link: " + page + " -> " + target);
    }
  }
});

test("product data matches dedicated detail pages and uses positive NGN numbers", () => {
  const context = { window: {} };
  vm.runInNewContext(read("assets/catalog.js"), context);
  const records = context.window.CC_CATALOG;
  assert.equal(records.length, 28);
  assert.equal(new Set(Array.from(records, p => p.id)).size, 28);
  assert.equal(Array.from(records, p => p.category).filter(c => c === "Desk").length, 7);
  for (const item of records) {
    assert.ok(Number.isInteger(item.price) && item.price > 0);
    if (fs.existsSync(path.join(root, "products", item.id + ".html"))) {
      const html = read("products/" + item.id + ".html");
      assert.ok(html.includes(item.name), item.id + " title in static HTML");
      assert.ok(html.includes('data-add="' + item.id + '"'), item.id + " static cart action");
    } else {
      assert.ok(fs.existsSync(path.join(root, "product-preview.html")), "missing dynamic product route");
    }
  }
});

test("shared JavaScript parses without syntax errors", () => {
  assert.doesNotThrow(() => new vm.Script(read("assets/catalog.js")));
  assert.doesNotThrow(() => new vm.Script(read("assets/main.js")));
  assert.doesNotThrow(() => new vm.Script(read("assets/studio.js")));
  assert.doesNotThrow(() => new vm.Script(read("assets/order-demo.js")));
});

test("sensitive demo features have honest disclosures", () => {
  assert.match(read("checkout.html"), /without real payment or personal information/i);
  assert.match(read("contact.html"), /No message is delivered or saved/i);
  assert.match(read("cart.html"), /nothing is bought or transmitted/i);
});


test("the shared script creates a bag accessible on every page, with removal and totals", () => {
  const js = read("assets/main.js");
  assert.match(js, /function initQuickBag\(/);
  assert.match(js, /quick-bag-trigger/);
  assert.match(js, /aria-modal/);
  assert.match(js, /function renderQuickBag\(/);
  assert.match(js, /data-remove/);
  assert.match(js, /quick-bag-subtotal/);
  assert.match(js, /renderQuickBag\(\);renderCart\(\);renderCheckout\(\)/);
  assert.match(js, /localStorage\.setItem/);
});

test("payment step lists example banks and explicitly cannot transfer funds", () => {
  const html = read("checkout.html");
  for (const bank of ["Access Bank", "First Bank", "Guaranty Trust Bank", "United Bank for Africa", "Zenith Bank", "Fidelity Bank"]) {
    assert.ok(html.includes(bank), "missing demonstration bank " + bank);
  }
  assert.match(html, /id="show-payment-options"/);
  assert.match(html, /id="payment-options"[^>]*hidden/);
  assert.match(html, /name="demo-bank"/);
  assert.match(html, /id="payment-amount"/);
  assert.match(html, /<button[^>]+disabled aria-disabled="true"/);
  assert.doesNotMatch(html, /demo-confirm|Complete demo checkout/);
  assert.doesNotMatch(read("assets/main.js"), /id="demo-confirm"|getElementById\("demo-confirm"\)/);
});


test("scrollable browse and owner-side local editor have explicit boundaries", () => {
 const home=read("index.html"),shop=read("shop.html"),editor=read("catalog-studio.html");
 assert.match(home, /id="featured-rail"/);
 assert.match(home, /data-rail-move="-1"/);
 assert.match(home, /data-rail-move="1"/);
 assert.match(shop, /id="show-more"/);
 assert.match(shop, /href="catalog-studio.html"/);
 assert.match(editor, /Owner system preview/i);
 assert.match(editor, /read.only/i);
 assert.doesNotMatch(editor, /id="studio-form"|id="studio-photo"|id="studio-export"/);
 assert.match(read("assets/main.js"), /function initCatalogViews/);
 assert.match(read("assets/main.js"), /IntersectionObserver/);
 assert.match(read("assets/studio.js"), /localStorage.setItem/);
 assert.doesNotMatch(read("assets/studio.js"), /fetch\s*\(/);
});


test("direct quantity fields allow 1 to 999 on every product details page",()=>{
  assert.match(read("assets/main.js"), /MAX_QTY=999/);
  assert.match(read("assets/main.js"), /Number\.isSafeInteger\(qty\)/);
  for (const page of productPages) assert.match(read(page), /max="999"/, page + " must accept bulk quantities");
  assert.match(read("product-preview.html"), /max="999"/);
});


test("simulated checkout and shipping journey are functional yet clearly labelled",()=>{
  const checkout=read("checkout.html");
  assert.match(checkout,/id="order-journey-title"/);
  assert.match(checkout,/id="place-demo-order"/);
  assert.match(checkout,/id="payment-options"/);
  assert.match(checkout,/Real payment disabled/);
  assert.match(checkout,/Working browser-local simulation/);
  assert.match(checkout,/no live payment verification/);
  assert.match(checkout,/no shipping emails sent/);
  assert.match(checkout,/<button type="button" class="btn wide" disabled aria-disabled="true">/);
  assert.match(checkout,/assets\/order-demo.js/);
  const orders=read("orders.html"),admin=read("order-studio.html");
  assert.match(orders,/id="demo-orders-list"/);
  assert.match(admin,/Owner system preview/i);
  assert.match(admin,/read.only/i);
  assert.doesNotMatch(admin,/id="demo-admin-orders"/);
  assert.match(read("assets/order-demo.js"),/function initCheckout/);
  assert.match(read("assets/order-demo.js"),/function initCustomerOrders/);
  assert.match(read("assets/order-demo.js"),/function initOwnerOrders/);
  assert.doesNotMatch(read("assets/order-demo.js"),/\bfetch\s*\(/);
});
