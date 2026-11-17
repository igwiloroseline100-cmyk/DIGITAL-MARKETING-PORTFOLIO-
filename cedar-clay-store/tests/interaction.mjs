import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
function boot({pathname="/cedar-clay-store/shop.html",checkout=false}={}){
  const ids=new Map(),listeners={},bodyClasses=new Set(),storage=new Map();
  let document;
  function element(id){
    const handlers={};const attrs={},classes=new Set();
    return {
      id,hidden:false,innerHTML:"",textContent:"",disabled:false,tabIndex:0,
      attrs,handlers,
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x)}},
      addEventListener:(event,handler)=>{handlers[event]=handler},
      setAttribute:(key,val)=>{attrs[key]=val},
      getAttribute:key=>attrs[key],
      focus(){document.activeElement=this},
      scrollIntoView(){},
      querySelectorAll(){return []}
    };
  }
  const get=id=>ids.get(id)||null;
  const headerCount=element("header-count");
  function register(id){if(!ids.has(id))ids.set(id,element(id));return get(id)}
  const body=element("body");
  body.classList={add:x=>bodyClasses.add(x),remove:x=>bodyClasses.delete(x)};
  body.append=(mount)=>{
    register("quick-bag-widget").innerHTML=mount.innerHTML;
    for(const match of mount.innerHTML.matchAll(/\bid="([^"]+)"/g))register(match[1]);
    const modal=get("quick-bag-panel"),scrim=get("quick-bag-scrim");
    if(modal)modal.hidden=true;
    if(scrim)scrim.hidden=true;
  };
  if(checkout){
    for(const id of ["checkout-items","checkout-total","show-payment-options","payment-options","payment-options-heading","payment-amount","bank-selection-note"])register(id);
    get("payment-options").hidden=true;
    get("bank-selection-note").hidden=true;
  }
  document={
    body,activeElement:null,
    createElement:tag=>element(tag),
    getElementById:get,
    querySelector:()=>null,
    querySelectorAll:selector=>selector==="[data-cart-count]"?[headerCount,...(get("quick-bag-trigger")?[register("float-count")]:[])]:[],
    addEventListener:(name,callback)=>{listeners[name]=callback}
  };
  const bankStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  const wListeners={};
  const window={addEventListener:(event,fn)=>wListeners[event]=fn,CC_CATALOG:null};
  const ctx={window,document,location:{pathname,search:""},localStorage:bankStorage,Intl,URL,URLSearchParams,console,clearTimeout(){},setTimeout(){return 1}};
  vm.runInNewContext(read("assets/catalog.js"),ctx);
  vm.runInNewContext(read("assets/main.js"),ctx);
  function documentClick(attribute,id){
    const attr="[data-"+attribute+"]";
    const trigger={dataset:{[attribute]:id}};
    listeners.click({target:{closest:selector=>selector.split(",").map(x=>x.trim()).includes(attr)?trigger:null},preventDefault(){}});
  }
  function fire(id,type,details={}){
    const el=get(id);
    assert.ok(el,"missing element "+id);
    assert.equal(typeof el.handlers[type],"function","missing listener "+id+" "+type);
    el.handlers[type]({...details,target:details.target??el});
  }
  return {get,documentClick,fire,storage,body,headerCount};
}
test("floating bag counts products, calculates subtotals, updates quantities and removes items",()=>{
  const app=boot();
  assert.equal(app.get("quick-bag-button-total").textContent,"₦0");
  app.documentClick("add","everyday-mug");
  assert.equal(app.get("quick-bag-button-total").textContent,"₦9,500");
  assert.equal(app.headerCount.textContent,"1");
  assert.equal(app.get("quick-bag-panel").hidden,false);
  assert.match(app.get("quick-bag-items").innerHTML,/Everyday Stoneware Mug/);
  app.documentClick("add","everyday-mug");
  assert.equal(app.get("quick-bag-subtotal").textContent,"₦19,000");
  app.documentClick("increase","everyday-mug");
  assert.equal(app.get("quick-bag-subtotal").textContent,"₦28,500");
  app.documentClick("decrease","everyday-mug");
  assert.equal(app.get("quick-bag-subtotal").textContent,"₦19,000");
  app.documentClick("remove","everyday-mug");
  assert.equal(app.get("quick-bag-subtotal").textContent,"₦0");
  assert.equal(app.headerCount.textContent,"0");
  assert.match(app.get("quick-bag-items").innerHTML,/bag is empty/i);
  assert.equal(app.get("quick-bag-checkout").getAttribute("aria-disabled"),"true");
});
test("bag can be opened and closed from a product detail page using correct relative links",()=>{
  const app=boot({pathname:"/cedar-clay-store/products/everyday-mug.html"});
  app.documentClick("add","orbit-vase");
  assert.match(app.get("quick-bag-items").innerHTML,/href="\.\.\/products\/orbit-vase\.html"/);
  assert.match(app.get("quick-bag-widget").innerHTML,/href="\.\.\/checkout\.html"/);
  app.fire("quick-bag-close","click");
  assert.equal(app.get("quick-bag-panel").hidden,true);
  assert.equal(app.get("quick-bag-trigger").getAttribute("aria-expanded"),"false");
  app.fire("quick-bag-trigger","click");
  assert.equal(app.get("quick-bag-panel").hidden,false);
  app.fire("quick-bag-scrim","click");
  assert.equal(app.get("quick-bag-panel").hidden,true);
});
test("payment options are a preview, do not clear the bag, and require a selection for demo feedback",()=>{
  const app=boot({pathname:"/cedar-clay-store/checkout.html",checkout:true});
  assert.equal(app.get("show-payment-options").disabled,true);
  app.documentClick("add","everyday-mug");
  assert.equal(app.get("show-payment-options").disabled,false);
  assert.equal(app.get("checkout-total").textContent,"₦9,500");
  app.fire("show-payment-options","click");
  assert.equal(app.get("payment-options").hidden,false);
  app.fire("payment-options","change",{target:{matches:query=>query==='input[name="demo-bank"]',value:"Access Bank"}});
  assert.match(app.get("bank-selection-note").textContent,/Access Bank selected/);
  assert.equal(app.get("quick-bag-subtotal").textContent,"₦9,500");
  assert.equal(app.storage.get("cedar-clay-cart-v1"),'{"everyday-mug":1}');
});
