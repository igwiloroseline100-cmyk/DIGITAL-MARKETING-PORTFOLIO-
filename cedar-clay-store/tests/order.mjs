import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const code=fs.readFileSync(path.join(root,"assets/order-demo.js"),"utf8");
const catalog=fs.readFileSync(path.join(root,"assets/catalog.js"),"utf8");
const ORDER_KEY="cedar-clay-demo-orders-v1",CART_KEY="cedar-clay-cart-v1";
function harness(page="checkout",shared=new Map(),orderId=""){
  const handlers={},nodes=new Map(),selection={method:"",bank:""},navigation=[];
  function node(id){
    if(!nodes.has(id)){
      const o={id,innerHTML:"",textContent:"",hidden:false,disabled:id==="place-demo-order",handlers:{},dataset:{},
        addEventListener(name,fn){this.handlers[name]=fn},focus(){},setAttribute(){},getAttribute(){return null}};
      nodes.set(id,o);
    }
    return nodes.get(id);
  }
  const existing={
    checkout:["place-demo-order","payment-options","demo-order-explanation","view-demo-orders"],
    customer:["demo-orders-list"],
    admin:["demo-admin-orders","demo-admin-count"]
  }[page];
  for(const id of existing)node(id);
  const document={
    getElementById:id=>nodes.get(id)||null,
    querySelector:query=>query.includes("demo-method")?(selection.method?{value:selection.method}:null):
      query.includes("demo-bank")?(selection.bank?{value:selection.bank}:null):null
  };
  const localStorage={getItem:k=>shared.has(k)?shared.get(k):null,
    setItem:(k,v)=>shared.set(k,v),removeItem:k=>shared.delete(k)};
  const location={search:orderId?"?id="+orderId:"",assign:url=>navigation.push(url)};
  const win={CC_CATALOG:null,addEventListener:(kind,handler)=>handlers[kind]=handler};
  const context={window:win,document,location,localStorage,Intl,Date,Math,Number,URLSearchParams};
  vm.runInNewContext(catalog,context);
  vm.runInNewContext(code,context);
  return {
    node,shared,selection,navigation,handlers,
    choose(method,bank=""){
      selection.method=method;selection.bank=bank;
      node("payment-options").handlers.change({target:{value:bank||method}});
    },
    create(){node("place-demo-order").handlers.click()},
    orders(){return JSON.parse(shared.get(ORDER_KEY)||"[]")},
    orderStudioAction(id,type,status,date){
      const orderNode=node("demo-admin-orders");
      const card={querySelector:q=>q.includes("data-status-for")?{value:status}:q.includes("data-date-for")?{value:date}:{textContent:""}};
      const target={dataset:type==="save"?{saveOrder:id}:{collectOrder:id},
        closest:q=>q==="[data-save-order]"?(type==="save"?target:null):q==="[data-collect-order]"?(type==="collect"?target:null):q==="[data-demo-order]"?card:null};
      orderNode.handlers.click({target});
    }
  };
}
function seededCart(map){map.set(CART_KEY,JSON.stringify({"everyday-mug":50,"arc-lamp":2}));return map}
test("checkout requires a payment method and creates a real browser-local SAMPLE order",()=>{
 const app=harness("checkout",seededCart(new Map()));
 assert.equal(app.node("place-demo-order").disabled,true);
 app.choose("card");
 assert.equal(app.node("place-demo-order").disabled,false);
 app.create();
 const orders=app.orders();
 assert.equal(orders.length,1);
 assert.match(orders[0].id,/^CC-DEMO-/);
 assert.equal(orders[0].status,"Received");
 assert.equal(orders[0].method,"card");
 assert.equal(orders[0].total,570000);
 assert.equal(orders[0].items.length,2);
 assert.equal(app.shared.has(CART_KEY),false);
 assert.match(app.navigation[0],/^orders\.html\?id=CC-DEMO-/);
});
test("transfer checkout won't progress before a bank is chosen",()=>{
 const app=harness("checkout",seededCart(new Map()));
 app.choose("transfer");
 assert.equal(app.node("place-demo-order").disabled,true);
 app.create();
 assert.equal(app.orders().length,0);
 app.choose("transfer","Zenith Bank");
 assert.equal(app.node("place-demo-order").disabled,false);
 app.create();
 assert.equal(app.orders()[0].bank,"Zenith Bank");
 assert.equal(app.orders()[0].method,"transfer");
});
test("pay-on-delivery remains due until simulated cash collection in order studio",()=>{
 const shared=seededCart(new Map()),checkout=harness("checkout",shared);
 checkout.choose("delivery");
 assert.equal(checkout.node("place-demo-order").disabled,false);
 checkout.create();
 const order=checkout.orders()[0];
 assert.equal(order.method,"delivery");
 assert.equal(order.collected,false);
 const studio=harness("admin",shared);
 assert.match(studio.node("demo-admin-orders").innerHTML,/Due on delivery \(demo\)/);
 studio.orderStudioAction(order.id,"collect");
 const collected=studio.orders()[0];
 assert.equal(collected.collected,true);
 assert.match(studio.node("demo-admin-orders").innerHTML,/Cash collection simulated/);
});
test("order studio can schedule a demo date and customer tracking reflects it",()=>{
 const shared=seededCart(new Map()),checkout=harness("checkout",shared);
 checkout.choose("card");checkout.create();
 const id=checkout.orders()[0].id;
 const studio=harness("admin",shared);
 studio.orderStudioAction(id,"save","Scheduled","2026-11-25");
 const updated=studio.orders()[0];
 assert.equal(updated.status,"Scheduled");
 assert.equal(updated.shippingDate,"2026-11-25");
 const customer=harness("customer",shared,id);
 assert.match(customer.node("demo-orders-list").innerHTML,/Scheduled/);
 assert.match(customer.node("demo-orders-list").innerHTML,/2026-11-25/);
 assert.match(customer.node("demo-orders-list").innerHTML,/no email was sent/i);
});
test("shipping date is required before scheduled or shipped statuses",()=>{
 const shared=seededCart(new Map()),checkout=harness("checkout",shared);
 checkout.choose("card");checkout.create();
 const id=checkout.orders()[0].id,studio=harness("admin",shared);
 studio.orderStudioAction(id,"save","Shipped","");
 assert.equal(studio.orders()[0].status,"Received");
});
