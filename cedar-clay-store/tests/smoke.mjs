import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const pages = ["index.html", "shop.html", "cart.html", "checkout.html", "about.html", "contact.html"];
const productFolder = path.join(root, "products");
const productPages = fs.readdirSync(productFolder).filter(p => p.endsWith(".html")).map(p => "products/" + p);
const allPages = [...pages, ...productPages];

test("all six core pages and sixteen unique detail pages exist", () => {
  assert.equal(pages.length, 6);
  assert.equal(productPages.length, 16);
  for (const page of allPages) assert.ok(fs.existsSync(path.join(root, page)), page);
});

test("every HTML page has an identifiable title, description and conservative indexing settings", () => {
  for (const page of allPages) {
    const html = read(page);
    assert.match(html, /<title>[^<]+<\/title>/, page + " title");
    assert.match(html, /<meta name="description" content="[^"]+"/, page + " description");
    assert.match(html, /<meta name="robots" content="noindex,follow"/, page + " noindex");
    assert.match(html, /<main id="main">/, page + " main content");
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
      assert.ok(absolute.startsWith(root + path.sep), "path outside project: " + page + " -> " + target);
      assert.ok(fs.existsSync(absolute), "missing link: " + page + " -> " + target);
    }
  }
});

test("product data matches dedicated detail pages and uses positive NGN numbers", () => {
  const context = { window: {} };
  vm.runInNewContext(read("assets/catalog.js"), context);
  const records = context.window.CC_CATALOG;
  assert.equal(records.length, 16);
  assert.equal(new Set(Array.from(records, p => p.id)).size, 8);
  assert.equal(Array.from(records, p => p.category).filter(c => c === "Desk").length, 5);
  for (const item of records) {
    assert.ok(Number.isInteger(item.price) && item.price > 0);
    const html = read("products/" + item.id + ".html");
    assert.ok(html.includes(item.name), item.id + " title in HTML");
    assert.ok(html.includes('data-add="' + item.id + '"'), item.id + " cart action");
  }
});

test("shared JavaScript parses without syntax errors", () => {
  assert.doesNotThrow(() => new vm.Script(read("assets/catalog.js")));
  assert.doesNotThrow(() => new vm.Script(read("assets/main.js")));
});

test("sensitive demo features have honest disclosures", () => {
  assert.match(read("checkout.html"), /no payment information/i);
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
