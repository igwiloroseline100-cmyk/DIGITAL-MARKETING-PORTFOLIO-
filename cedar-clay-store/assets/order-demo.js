/* Cedar & Clay: fully interactive browser-local ORDER DEMONSTRATION.
   No payments, real transaction verification, shipping, messaging or secure owner authentication. */
(()=>{
"use strict";
const ORDER_KEY="cedar-clay-demo-orders-v1",CART_KEY="cedar-clay-cart-v1";
const products=Array.isArray(window.CC_CATALOG)?window.CC_CATALOG:[];
const byId=new Map(products.map(p=>[p.id,p]));
const STAGES=["Received","Processing","Scheduled","Shipped","Delivered"];
const money=n=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cartLines(){
  try{
    const c=JSON.parse(localStorage.getItem(CART_KEY)||"{}");
    if(!c||typeof c!=="object"||Array.isArray(c))return [];
    return Object.entries(c).filter(([id,q])=>byId.has(id)&&Number.isInteger(q)&&q>0)
      .map(([id,q])=>({id,name:byId.get(id).name,price:byId.get(id).price,qty:Math.min(q,999)}));
  }catch{return []}
}
function readOrders(){
  try{
    const value=JSON.parse(localStorage.getItem(ORDER_KEY)||"[]");
    return Array.isArray(value)?value.filter(o=>o&&/^CC-DEMO-[A-Z0-9-]{8,45}$/.test(o.id)&&Array.isArray(o.items)&&Number.isSafeInteger(o.total)&&o.total>0).slice(0,30):[];
  }catch{return []}
}
function saveOrders(list){localStorage.setItem(ORDER_KEY,JSON.stringify(list.slice(0,30)))}
function orderId(){return "CC-DEMO-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase()}
function methodLabel(m){return {transfer:"Bank transfer",card:"Card",delivery:"Pay on delivery"}[m]||"Demo"}
function paymentLabel(o){return o.method==="delivery"?(o.collected?"Cash collection simulated":"Due on delivery (demo)"):"Test payment simulated — no money moved"}
function feedback(el,msg){if(el){el.textContent=msg;el.hidden=false}}
function methodSelection(){return document.querySelector('input[name="demo-method"]:checked')?.value||""}
function bankSelection(){return document.querySelector('input[name="demo-bank"]:checked')?.value||""}
function initCheckout(){
 const button=$("place-demo-order"),panel=$("payment-options");
 if(!button||!panel)return;
 const note=$("demo-order-explanation");
 const existing=$("view-demo-orders");
 function refresh(){
   const lines=cartLines(),method=methodSelection(),bank=bankSelection();
   const eligible=lines.length>0&&["transfer","delivery","card"].includes(method)&&(method!=="transfer"||!!bank);
   button.disabled=!eligible;
   button.textContent=method==="delivery"?"Place sample order (no payment)":"Simulate successful test payment & order";
   if(note)note.textContent=!lines.length?"Add a product to your bag to test this workflow.":!method?"Choose a demo payment method to continue.":method==="transfer"&&!bank?"Choose a sample bank to continue the simulation.":"This creates a LOCAL sample order. Nothing is charged or sent.";
 }
 panel.addEventListener("change",refresh);
 window.addEventListener("storage",refresh);
 refresh();
 button.addEventListener("click",()=>{
   if(button.disabled)return;
   const items=cartLines(),method=methodSelection(),bank=bankSelection();
   if(!items.length||!["transfer","delivery","card"].includes(method)||(method==="transfer"&&!bank))return;
   const total=items.reduce((sum,x)=>sum+x.price*x.qty,0);
   if(!Number.isSafeInteger(total)||total<=0||total>10000000000){feedback(note,"The sample order total is outside demo limits.");return}
   const order={
     id:orderId(),createdAt:new Date().toISOString(),items,total,method,
     bank:method==="transfer"?bank:"",collected:false,
     status:"Received",shippingDate:"",updatedAt:new Date().toISOString()
   };
   try{
     const saved=readOrders();saved.unshift(order);saveOrders(saved);
     localStorage.removeItem(CART_KEY);
     location.assign("orders.html?id="+encodeURIComponent(order.id));
   }catch{feedback(note,"Couldn't store your demo order in this browser. Check browser storage and retry.")}
 });
 if(existing)existing.hidden=false;
}
function listItems(o){return o.items.map(item=>'<li><span>'+esc(item.name)+' × '+Number(item.qty||0)+'</span><strong>'+money(Number(item.price||0)*Number(item.qty||0))+'</strong></li>').join("")}
function notification(o){
 const when=o.shippingDate?new Date(o.shippingDate+"T00:00:00").toLocaleDateString("en-NG",{year:"numeric",month:"long",day:"numeric"}):"Awaiting confirmation";
 if(o.status==="Scheduled"||o.status==="Shipped"||o.status==="Delivered")
  return "Sample message: Your order "+o.id+" is "+o.status.toLowerCase()+". Shipping date: "+when+". This notification is a preview only; no email was sent.";
 return "Sample message: We've received your sample order "+o.id+". Our team is reviewing the items. Your shipping date will be confirmed when scheduling is complete. (Preview only; no message sent.)";
}
function orderCard(o,expanded=false){
 const date=new Date(o.createdAt).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
 const stage=STAGES.includes(o.status)?o.status:"Received";
 return '<article class="demo-order-card"><div class="demo-order-top"><div><p class="kicker">SAMPLE ORDER · '+esc(date)+'</p><h2>'+esc(o.id)+'</h2></div><strong class="demo-status">'+esc(stage)+'</strong></div>'+
 '<div class="demo-order-metadata"><span><b>Total:</b> '+money(o.total)+'</span><span><b>Payment method:</b> '+esc(methodLabel(o.method))+'</span><span><b>Payment:</b> '+esc(paymentLabel(o))+'</span><span><b>Shipping:</b> '+esc(o.shippingDate||"Date not confirmed")+'</span></div>'+
 (expanded?'<h3>Items</h3><ul class="demo-order-lines">'+listItems(o)+'</ul><p class="notice demo-notice">'+esc(notification(o))+'</p>':'<a class="plain-link" href="orders.html?id='+encodeURIComponent(o.id)+'">View order details →</a>')+'</article>';
}
function initCustomerOrders(){
 const root=$("demo-orders-list");if(!root)return;
 const orders=readOrders(),id=new URLSearchParams(location.search).get("id");
 if(!orders.length){root.innerHTML='<div class="empty"><h2>No sample orders in this browser</h2><p>Try a simulated checkout to see order tracking.</p><a class="btn" href="shop.html">Browse sample products →</a></div>';return}
 const shown=id?orders.filter(o=>o.id===id):orders;
 if(!shown.length){root.innerHTML='<div class="empty"><h2>Order unavailable here</h2><p>Order history is stored only in the browser where you created it.</p><a class="btn" href="orders.html">See local order history</a></div>';return}
 root.innerHTML=shown.map(o=>orderCard(o,!!id)).join("");
}
function adminCard(o){
 const date=new Date(o.createdAt).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
 return '<article class="demo-order-card" data-demo-order="'+esc(o.id)+'"><div class="demo-order-top"><div><p class="kicker">SAMPLE ORDER · '+esc(date)+'</p><h2>'+esc(o.id)+'</h2></div><strong class="demo-status">'+esc(o.status)+'</strong></div>'+
 '<div class="demo-order-metadata"><span><b>Total:</b> '+money(o.total)+'</span><span><b>Payment:</b> '+esc(paymentLabel(o))+'</span><span><b>Method:</b> '+esc(methodLabel(o.method))+'</span></div>'+
 '<ul class="demo-order-lines">'+listItems(o)+'</ul><div class="demo-admin-controls"><label>Order stage<select data-status-for="'+esc(o.id)+'">'+STAGES.map(s=>'<option value="'+s+'" '+(o.status===s?"selected":"")+'>'+s+'</option>').join("")+'</select></label>'+
 '<label>Sample shipping date<input type="date" data-date-for="'+esc(o.id)+'" value="'+esc(o.shippingDate||"")+'"></label>'+
 '<button class="btn" type="button" data-save-order="'+esc(o.id)+'">Update status</button>'+
 (o.method==="delivery"&&!o.collected?'<button class="studio-reset" type="button" data-collect-order="'+esc(o.id)+'">Simulate cash collected</button>':"")+'</div>'+
 '<p class="demo-admin-feedback" role="status"></p><div class="demo-message"><h3>Customer notification preview</h3><p>'+esc(notification(o))+'</p></div></article>';
}
function initOwnerOrders(){
 const root=$("demo-admin-orders");if(!root)return;
 function render(){
   const orders=readOrders();
   $("demo-admin-count").textContent=orders.length+" sample orders in this browser";
   root.innerHTML=orders.length?orders.map(adminCard).join(""):'<div class="empty"><h2>No sample orders yet</h2><p>Create one from the store checkout, then come here to process it.</p><a class="btn" href="shop.html">Go to shop →</a></div>';
 }
 root.addEventListener("click",event=>{
   const save=event.target.closest("[data-save-order]"),collect=event.target.closest("[data-collect-order]");
   if(!save&&!collect)return;
   const id=save?.dataset.saveOrder||collect?.dataset.collectOrder;
   const list=readOrders(),order=list.find(o=>o.id===id);
   if(!order)return;
   if(save){
     const card=save.closest("[data-demo-order]");
     const stage=card.querySelector("[data-status-for]").value;
     const date=card.querySelector("[data-date-for]").value;
     if(!STAGES.includes(stage))return;
     if(["Scheduled","Shipped","Delivered"].includes(stage)&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+"T00:00:00").getTime()))){
       feedback(card.querySelector(".demo-admin-feedback"),"Choose a valid shipping date for this stage.");return;
     }
     order.status=stage;order.shippingDate=date;
   }else{if(order.method!=="delivery")return;order.collected=true}
   order.updatedAt=new Date().toISOString();
   try{saveOrders(list);render()}catch{const msg=event.target.closest("[data-demo-order]")?.querySelector(".demo-admin-feedback");feedback(msg,"Browser storage failed; change not saved.")}
 });
 render();
 window.addEventListener("storage",render);
}
initCheckout();
initCustomerOrders();
initOwnerOrders();
})();
