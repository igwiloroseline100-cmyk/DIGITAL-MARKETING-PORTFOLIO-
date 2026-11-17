(()=>{"use strict";const KEY="cedar-clay-cart-v1",products=window.CC_CATALOG||[],byId=Object.fromEntries(products.map(p=>[p.id,p]));let fallback={};const price=n=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
function clean(raw){if(!raw||Array.isArray(raw)||typeof raw!=="object")return {};const result={};for(const [id,q] of Object.entries(raw))if(byId[id]&&Number.isInteger(q)&&q>0)result[id]=Math.min(q,10);return result}
function getCart(){try{const raw=localStorage.getItem(KEY);return clean(raw?JSON.parse(raw):{})}catch{return clean(fallback)}}
function setCart(raw){fallback=clean(raw);try{localStorage.setItem(KEY,JSON.stringify(fallback))}catch{}countBadge();renderQuickBag();renderCart();renderCheckout()}
function lines(){return Object.entries(getCart()).map(([id,qty])=>({p:byId[id],qty})).filter(x=>x.p)}
function sum(){return lines().reduce((n,x)=>n+x.p.price*x.qty,0)}
function countBadge(){const n=lines().reduce((s,x)=>s+x.qty,0);document.querySelectorAll("[data-cart-count]").forEach(e=>{e.textContent=String(n);e.setAttribute("aria-label",n+" items in bag")})}
let timer;function notify(s){const el=document.getElementById("toast");if(!el)return;el.textContent=s;el.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>el.classList.remove("show"),2400)}
function add(id,q){if(!byId[id])return;const cart=getCart(),qty=Math.max(1,Math.min(10,parseInt(q,10)||1));cart[id]=Math.min(10,(cart[id]||0)+qty);setCart(cart);notify(byId[id].name+" added to your bag");const trigger=document.getElementById("quick-bag-trigger");if(trigger){trigger.classList.remove("bag-pop");void trigger.offsetWidth;trigger.classList.add("bag-pop")}}
function change(id,delta){const cart=getCart();if(!cart[id])return;const next=cart[id]+delta;if(next<=0)delete cart[id];else cart[id]=Math.min(next,10);setCart(cart)}
function remove(id){const cart=getCart();delete cart[id];setCart(cart);notify("Item removed")}

function pageRoot(){return location.pathname.includes("/products/")?"../":""}
function initQuickBag(){
  const mount=document.createElement("div");
  mount.id="quick-bag-widget";
  const prefix=pageRoot();
  mount.innerHTML='<button type="button" class="quick-bag-trigger" id="quick-bag-trigger" aria-controls="quick-bag-panel" aria-expanded="false" aria-label="Open shopping bag"><span aria-hidden="true">🛍️</span> My bag <b data-cart-count>0</b> <strong id="quick-bag-button-total">₦0</strong></button>'+
    '<div id="quick-bag-scrim" class="quick-bag-scrim" hidden></div>'+
    '<section role="dialog" aria-modal="true" aria-labelledby="quick-bag-title" class="quick-bag-panel" id="quick-bag-panel" hidden>'+
      '<div class="quick-bag-header"><div><p class="kicker">YOUR SELECTION</p><h2 id="quick-bag-title">My bag <span id="quick-bag-heading-count">(0)</span></h2></div><button type="button" class="quick-bag-close" id="quick-bag-close" aria-label="Close shopping bag">✕</button></div>'+
      '<div class="quick-bag-items" id="quick-bag-items" aria-live="polite"></div>'+
      '<div class="quick-bag-footer"><div class="summary-row total"><span>Subtotal</span><strong id="quick-bag-subtotal">₦0</strong></div><p>Sample prices only · No checkout payments</p><a id="quick-bag-checkout" class="btn wide" href="'+prefix+'checkout.html">Review checkout →</a><a class="back" href="'+prefix+'cart.html">Open full bag page</a></div>'+
    '</section>';
  document.body.append(mount);
  document.getElementById("quick-bag-trigger").addEventListener("click",openQuickBag);
  document.getElementById("quick-bag-close").addEventListener("click",closeQuickBag);
  document.getElementById("quick-bag-scrim").addEventListener("click",closeQuickBag);
  document.addEventListener("keydown",event=>{
    const panel=document.getElementById("quick-bag-panel");
    if(!panel||panel.hidden)return;
    if(event.key==="Escape"){event.preventDefault();closeQuickBag();return}
    if(event.key!=="Tab")return;
    const focusable=[...panel.querySelectorAll('button:not(:disabled),a[href]:not([aria-disabled="true"])')].filter(el=>!el.hidden);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  });
  renderQuickBag();
}
function openQuickBag(){
  const panel=document.getElementById("quick-bag-panel");
  if(!panel)return;
  renderQuickBag();
  panel.hidden=false;
  document.getElementById("quick-bag-scrim").hidden=false;
  document.getElementById("quick-bag-trigger").setAttribute("aria-expanded","true");
  document.body.classList.add("quick-bag-open");
  document.getElementById("quick-bag-close").focus();
}
function closeQuickBag(){
  const panel=document.getElementById("quick-bag-panel");
  if(!panel||panel.hidden)return;
  panel.hidden=true;
  document.getElementById("quick-bag-scrim").hidden=true;
  document.getElementById("quick-bag-trigger").setAttribute("aria-expanded","false");
  document.body.classList.remove("quick-bag-open");
  document.getElementById("quick-bag-trigger").focus();
}
function renderQuickBag(){
  const mount=document.getElementById("quick-bag-items");
  if(!mount)return;
  const all=lines(),num=all.reduce((n,x)=>n+x.qty,0),prefix=pageRoot();
  document.getElementById("quick-bag-heading-count").textContent="("+num+")";
  document.getElementById("quick-bag-button-total").textContent=price(sum());
  document.getElementById("quick-bag-subtotal").textContent=price(sum());
  const checkoutLink=document.getElementById("quick-bag-checkout");
  checkoutLink.setAttribute("aria-disabled",String(!all.length));
  checkoutLink.tabIndex=all.length?0:-1;
  if(!all.length){
    mount.innerHTML='<div class="quick-bag-empty"><p>Your bag is empty.</p><a class="plain-link" href="'+prefix+'shop.html">Explore products →</a></div>';
    return;
  }
  mount.innerHTML=all.map(({p,qty})=>'<article class="quick-bag-item"><div class="quick-bag-icon" aria-hidden="true" style="background:'+p.bg+'">'+p.emoji+'</div><div class="quick-bag-item-details"><a href="'+prefix+'products/'+p.id+'.html" class="quick-bag-name">'+esc(p.name)+'</a><span class="quick-bag-category">'+esc(p.category)+'</span><strong class="quick-bag-price">'+price(qty*p.price)+'</strong><div class="quick-bag-actions"><div class="qty-box" aria-label="Quantity of '+esc(p.name)+'"><button type="button" data-decrease="'+p.id+'" aria-label="Decrease '+esc(p.name)+' quantity">−</button><span>'+qty+'</span><button type="button" data-increase="'+p.id+'" aria-label="Increase '+esc(p.name)+' quantity" '+(qty===10?"disabled":"")+'>+</button></div><button type="button" class="remove" data-remove="'+p.id+'">Remove</button></div></div></article>').join("");
}

function renderCart(){const root=document.getElementById("cart-items");if(!root)return;const all=lines();document.getElementById("cart-total").textContent=price(sum());document.getElementById("cart-qty").textContent=String(all.reduce((n,x)=>n+x.qty,0));const checkout=document.getElementById("checkout-link");checkout.setAttribute("aria-disabled",String(!all.length));checkout.tabIndex=all.length?0:-1;
if(!all.length){root.innerHTML='<div class="empty"><h2>Your bag is empty</h2><p>Explore the collection and add a sample product.</p><a href="shop.html" class="btn">Browse products →</a></div>';return}
root.innerHTML=all.map(({p,qty})=>'<article class="cart-row"><div class="cart-mini" style="background:'+p.bg+'" aria-hidden="true">'+p.emoji+'</div><div class="cart-detail"><div><h2><a href="products/'+p.id+'.html">'+esc(p.name)+'</a></h2><p>'+esc(p.category)+' · Demonstration item</p><div class="qty-box" aria-label="Quantity of '+esc(p.name)+'"><button type="button" data-decrease="'+p.id+'" aria-label="Decrease quantity of '+esc(p.name)+'">−</button><span>'+qty+'</span><button type="button" data-increase="'+p.id+'" aria-label="Increase quantity of '+esc(p.name)+'">+</button></div><button type="button" class="remove" data-remove="'+p.id+'">Remove</button></div><strong class="cart-total">'+price(p.price*qty)+'</strong></div></article>').join("")}
function renderCheckout(){const root=document.getElementById("checkout-items");if(!root)return;const all=lines();document.getElementById("checkout-total").textContent=price(sum());const btn=document.getElementById("show-payment-options");btn.disabled=!all.length;
const paymentAmount=document.getElementById("payment-amount");if(paymentAmount)paymentAmount.textContent=price(sum());const transferAmount=document.getElementById("preview-transfer-amount");if(transferAmount)transferAmount.textContent=price(sum());
if(!all.length){const options=document.getElementById("payment-options");if(options)options.hidden=true;if(btn)btn.setAttribute("aria-expanded","false")}if(!all.length){root.innerHTML='<div class="empty"><h2>Nothing to review yet</h2><p>Add something to your bag to try this demonstration.</p><a class="btn" href="shop.html">Browse products →</a></div>';return}root.innerHTML=all.map(({p,qty})=>'<div class="checkout-row"><div><strong>'+esc(p.name)+'</strong><span>Quantity: '+qty+'</span></div><strong>'+price(p.price*qty)+'</strong></div>').join("")}

function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function productLink(p){return window.CC_BASE_CATALOG?.slice(0,16).some(item=>item.id===p.id)?"products/"+encodeURIComponent(p.id)+".html":"product-preview.html?id="+encodeURIComponent(p.id)}
function productCard(p){
 const image=p.imageData?'<img loading="lazy" width="320" height="320" src="'+p.imageData+'" alt="'+esc(p.name)+'">':'<span role="img" aria-label="'+esc(p.name)+' illustration">'+esc(p.emoji||"📦")+'</span>';
 return '<article class="product-card" data-product-card data-cat="'+esc(p.category)+'" data-name="'+esc(p.name.toLowerCase())+'" data-price="'+p.price+'">'+
 '<a class="product-link" href="'+productLink(p)+'"><div class="product-media" style="--tile:'+p.bg+'">'+image+'</div>'+
 '<span class="product-meta">'+esc(p.category)+' <b>'+price(p.price)+'</b></span><h3>'+esc(p.name)+'</h3></a>'+
 '<button class="quick-add" type="button" data-add="'+p.id+'" aria-label="Add '+esc(p.name)+' to bag">Add to bag <span aria-hidden="true">+</span></button></article>'
}
function initCatalogViews(){
 const grid=document.getElementById("catalog");
 if(grid)grid.innerHTML=products.map(productCard).join("");
 const rail=document.getElementById("featured-rail");
 if(rail){
   rail.innerHTML=products.map(productCard).join("");
   document.querySelectorAll("[data-rail-move]").forEach(btn=>btn.addEventListener("click",()=>{
      rail.scrollBy({left:(Number(btn.dataset.railMove)||1)*Math.max(280,rail.clientWidth*.85),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
   }));
 }
 const productView=document.getElementById("dynamic-detail");
 if(productView){
   const id=new URLSearchParams(location.search).get("id");
   const item=byId[id];
   const headline=document.getElementById("detail-name");
   if(!item){
     headline.textContent="Product not found";
     document.getElementById("dynamic-detail-info").hidden=true;
     document.getElementById("missing-product").hidden=false;
     return;
   }
   headline.textContent=item.name;
   document.getElementById("detail-category").textContent=item.category+" · DEMO PRODUCT";
   document.getElementById("detail-price").textContent=price(item.price);
   document.getElementById("detail-description").textContent=item.description||"A sample home-and-lifestyle product.";
   document.getElementById("detail-add").dataset.add=item.id;
   const visual=document.getElementById("detail-visual");
   visual.style.setProperty("--tile",item.bg);
   if(item.imageData){
     const pic=document.createElement("img");
     pic.src=item.imageData;pic.alt=item.name;pic.className="uploaded-detail";pic.width=600;pic.height=600;visual.append(pic);
   } else {
     const span=document.createElement("span");span.textContent=item.emoji||"📦";span.setAttribute("role","img");span.setAttribute("aria-label",item.name+" illustration");visual.append(span);
   }
   document.title=item.name+" | Cedar & Clay (demo)";
 }
}
function initShop(){const grid=document.getElementById("catalog");if(!grid)return;
 const all=[...grid.querySelectorAll("[data-product-card]")],search=document.getElementById("search"),sort=document.getElementById("sort"),
 count=document.getElementById("result-count"),empty=document.getElementById("no-results"),more=document.getElementById("show-more");
 let category="All",limit=12;
 const params=new URLSearchParams(location.search);
 if(params.has("q"))search.value=params.get("q").slice(0,60);
 if(["All","Decor","Desk","Kitchen","Textiles"].includes(params.get("category")))category=params.get("category");
 document.querySelectorAll("[data-filter]").forEach(b=>{const yes=b.dataset.filter===category;b.classList.toggle("selected",yes);b.setAttribute("aria-pressed",String(yes))});
 function apply(reset=false){
   if(reset)limit=12;
   const term=search.value.trim().toLowerCase();
   const filtered=all.filter(card=>(category==="All"||card.dataset.cat===category)&&card.dataset.name.includes(term));
   if(sort.value==="asc")filtered.sort((a,b)=>Number(a.dataset.price)-Number(b.dataset.price));
   else if(sort.value==="desc")filtered.sort((a,b)=>Number(b.dataset.price)-Number(a.dataset.price));
   else if(sort.value==="az")filtered.sort((a,b)=>a.dataset.name.localeCompare(b.dataset.name));
   else filtered.sort((a,b)=>all.indexOf(a)-all.indexOf(b));
   for(const card of all)card.hidden=true;
   for(const [i,card] of filtered.entries()){grid.append(card);card.hidden=i>=limit}
   count.textContent="Showing "+Math.min(limit,filtered.length)+" of "+filtered.length+" matching items · "+all.length+" in the collection";
   empty.hidden=filtered.length>0;
   if(more){more.hidden=filtered.length<=limit;more.textContent="Show more products ("+Math.max(0,filtered.length-limit)+" remaining)";}
   const url=new URL(location.href);
   if(term)url.searchParams.set("q",term);else url.searchParams.delete("q");
   if(category!=="All")url.searchParams.set("category",category);else url.searchParams.delete("category");
   history.replaceState(null,"",url.pathname+url.search+url.hash);
 }
 search.addEventListener("input",()=>apply(true));sort.addEventListener("change",()=>apply(true));
 document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{
   category=b.dataset.filter;
   document.querySelectorAll("[data-filter]").forEach(x=>{const yes=x===b;x.classList.toggle("selected",yes);x.setAttribute("aria-pressed",String(yes))});
   apply(true);
 }));
 document.getElementById("reset-filters").addEventListener("click",()=>{search.value="";sort.value="featured";document.querySelector('[data-filter="All"]').click();search.focus()});
 if(more){
   more.addEventListener("click",()=>{limit+=8;apply()});
   if(typeof IntersectionObserver!=="undefined"){
     const observer=new IntersectionObserver(entries=>{
       if(entries.some(entry=>entry.isIntersecting)&&!more.hidden){limit+=8;apply()}
     },{rootMargin:"0px 0px 200px 0px"});
     observer.observe(more);
   }
 }
 apply();
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b){const f=document.getElementById("detail-qty");if(f&&!f.reportValidity())return;add(b.dataset.add,f?f.value:1);return}const inc=e.target.closest("[data-increase]");if(inc){change(inc.dataset.increase,1);return}const dec=e.target.closest("[data-decrease]");if(dec){change(dec.dataset.decrease,-1);return}const rem=e.target.closest("[data-remove]");if(rem){remove(rem.dataset.remove);return}const chk=e.target.closest("#checkout-link, #quick-bag-checkout");if(chk&&chk.getAttribute("aria-disabled")==="true")e.preventDefault()});
const menu=document.querySelector(".nav-toggle"),nav=document.getElementById("nav-menu");if(menu&&nav){menu.addEventListener("click",()=>{const open=menu.getAttribute("aria-expanded")!=="true";menu.setAttribute("aria-expanded",String(open));nav.classList.toggle("open",open)});document.addEventListener("keydown",e=>{if(e.key==="Escape"){menu.setAttribute("aria-expanded","false");nav.classList.remove("open")}})}

function initPaymentPreview(){
  const reveal=document.getElementById("show-payment-options");
  const panel=document.getElementById("payment-options");
  if(!reveal||!panel)return;
  const methodPanels={
    transfer:document.getElementById("transfer-preview"),
    delivery:document.getElementById("delivery-preview"),
    card:document.getElementById("card-preview")
  };
  const selectedMethod=document.getElementById("method-selection-note");
  const bankNote=document.getElementById("bank-selection-note");
  const finalLabel=document.getElementById("payment-action-label");
  function displayMethod(method){
    for(const [key,element] of Object.entries(methodPanels))if(element)element.hidden=key!==method;
    if(bankNote)bankNote.hidden=true;
    if(selectedMethod){
      selectedMethod.hidden=false;
      selectedMethod.textContent={
        transfer:"Bank transfer selected for preview. The example account below is NOT a payable account.",
        delivery:"Pay on delivery selected for preview. No delivery or order is arranged.",
        card:"Card selected for preview. No card fields or processor are connected."
      }[method]||"Select a method to continue the preview.";
    }
    if(finalLabel)finalLabel.textContent=method==="delivery"?"Place order": "Pay";
  }
  reveal.addEventListener("click",()=>{
    if(!lines().length)return;
    panel.hidden=false;
    reveal.setAttribute("aria-expanded","true");
    document.getElementById("payment-options-heading").focus();
  });
  panel.addEventListener("change",event=>{
    if(event.target.matches('input[name="demo-method"]')){
      displayMethod(event.target.value);
      return;
    }
    if(event.target.matches('input[name="demo-bank"]')){
      if(bankNote){
        bankNote.hidden=false;
        bankNote.textContent=event.target.value+" selected. The account-number field is a non-payable placeholder; do not attempt a transfer.";
      }
      const bankTitle=document.getElementById("selected-bank-title");
      if(bankTitle)bankTitle.textContent=event.target.value+" · DEMO ONLY";
    }
  });
}

document.getElementById("contact-demo")?.addEventListener("submit",e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;const msg=document.getElementById("contact-feedback");msg.textContent="Validation passed. This was a local demo; your message was not sent or stored.";msg.hidden=false;e.currentTarget.reset()});
initCatalogViews();initQuickBag();initShop();initPaymentPreview();countBadge();renderCart();renderCheckout();window.addEventListener("storage",()=>{countBadge();renderQuickBag();renderCart();renderCheckout()});
})();