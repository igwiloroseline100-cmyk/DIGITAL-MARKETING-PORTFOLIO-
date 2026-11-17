import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=fs.readFileSync(path.join(root,"assets/studio.js"),"utf8");
function harness(){
 const elements=new Map(),storage=new Map();
 function el(id){
  if(elements.has(id))return elements.get(id);
  const handlers={};
  const obj={id,handlers,value:"",checked:false,files:[],dataset:{},style:{},children:[],disabled:false,textContent:"",
    classList:{toggle(){}},addEventListener(n,f){handlers[n]=f},
    reportValidity(){return true},reset(){},scrollIntoView(){},focus(){},
    append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},
    remove(){},click(){},setAttribute(){}};
  elements.set(id,obj);return obj;
 }
 for(const id of ["studio-form","studio-edit-id","studio-name","studio-category","studio-price",
 "studio-description","studio-photo","studio-colour","studio-remove-photo","studio-status",
 "studio-form-heading","studio-save","studio-reset","studio-products","studio-count","studio-export"]){el(id)}
 el("studio-name").value="Canvas Storage Bowl";
 el("studio-category").value="Kitchen";
 el("studio-price").value="12500";
 el("studio-description").value="A local-only sample product";
 el("studio-colour").value="#e5e9da";
 const document={getElementById:el,createElement(type){
   if(type==="canvas"){
      return {width:0,height:0,getContext(){return {fillRect(){},drawImage(){},fillStyle:""}},toDataURL(){return "data:image/jpeg;base64,QUJD"}}
   }
   return {tagName:type,className:"",textContent:"",dataset:{},style:{},type:"",append(){},remove(){},click(){},setAttribute(){}};
 },body:{append(){}}};
 const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,val)=>storage.set(key,val)};
 const context={document,localStorage,window:{confirm:()=>true},Math,Date,Number,Intl,JSON,Error,
  Blob,URL,createImageBitmap:async()=>({width:600,height:500,close(){}}),
  matchMedia:()=>({matches:true}),setTimeout(){}};
 vm.runInNewContext(source,context);
 return {el,storage};
}
test("catalogue editor saves locally without code or network requests",async()=>{
 const h=harness(),form=h.el("studio-form");
 assert.equal(typeof form.handlers.submit,"function");
 await form.handlers.submit({preventDefault(){}});
 const saved=JSON.parse(h.storage.get("cedar-clay-local-products-v1"));
 assert.equal(saved.length,1);
 assert.equal(saved[0].name,"Canvas Storage Bowl");
 assert.equal(saved[0].category,"Kitchen");
 assert.equal(saved[0].price,12500);
 assert.match(saved[0].id,/^demo-/);
 assert.equal(saved[0].imageData,"");
});
test("catalogue editor accepts a picture upload and stores a reduced JPEG data URL",async()=>{
 const h=harness();
 h.el("studio-photo").files=[{type:"image/png",size:100000}];
 await h.el("studio-form").handlers.submit({preventDefault(){}});
 const item=JSON.parse(h.storage.get("cedar-clay-local-products-v1"))[0];
 assert.equal(item.imageData,"data:image/jpeg;base64,QUJD");
});
test("catalogue editor can remove a locally added item",async()=>{
 const h=harness();
 await h.el("studio-form").handlers.submit({preventDefault(){}});
 const item=JSON.parse(h.storage.get("cedar-clay-local-products-v1"))[0];
 const click=h.el("studio-products").handlers.click;
 click({target:{closest:()=>({dataset:{action:"delete",id:item.id}})}});
 assert.equal(JSON.parse(h.storage.get("cedar-clay-local-products-v1")).length,0);
});
