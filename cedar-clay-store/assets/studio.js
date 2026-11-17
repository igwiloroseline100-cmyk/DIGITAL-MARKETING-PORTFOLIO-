/* Browser-local catalogue editor prototype. Deliberately no auth, backend or publish API. */
(()=>{
"use strict";
const KEY="cedar-clay-local-products-v1";
const MAX_ITEMS=16;
const input=id=>document.getElementById(id);
const form=input("studio-form");
if(!form)return;
const field={
  id:input("studio-edit-id"),name:input("studio-name"),category:input("studio-category"),
  price:input("studio-price"),description:input("studio-description"),
  photo:input("studio-photo"),color:input("studio-colour"),removePhoto:input("studio-remove-photo")
};
const status=input("studio-status");
const allowed=["Decor","Desk","Kitchen","Textiles"];
const currency=n=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);

function getRecords(){
  try{
    const stored=localStorage.getItem(KEY);
    const list=stored?JSON.parse(stored):[];
    return Array.isArray(list)?list.filter(item=>item&&typeof item.id==="string"&&item.id.startsWith("demo-")):[];
  }catch{return []}
}
function saveRecords(records){
  if(records.length>MAX_ITEMS)throw Error("The local demo currently supports a maximum of 16 additional products.");
  try{localStorage.setItem(KEY,JSON.stringify(records))}
  catch{throw Error("Your browser could not save these products. Storage may be full or disabled. Export a backup and try a smaller photo.")}
}
function tell(message,error=false){status.textContent=message;status.classList.toggle("error",error)}
async function encodePhoto(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Choose a JPG, PNG or WebP image.");
  if(file.size>4000000)throw Error("Please choose a picture smaller than 4 MB.");
  let bitmap;
  try{bitmap=await createImageBitmap(file)}catch{throw Error("That photo could not be opened. Try another JPG or PNG image.")}
  try{
    for(const max of [620,480,360,300]){
      const ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
      canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
      const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("Photo processing is not supported in this browser.");
      ctx.fillStyle="#fff";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [.72,.58,.43]){
        const encoded=canvas.toDataURL("image/jpeg",quality);
        if(encoded.length<180000)return encoded;
      }
    }
    throw Error("This photo is too large to store locally after compression. Try a simpler or smaller picture.");
  }finally{bitmap.close?.()}
}
function makeId(){return "demo-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)}
function cleanForm(){
  form.reset();field.id.value="";input("studio-form-heading").textContent="New sample product";
  input("studio-save").textContent="Save product locally";field.removePhoto.checked=false
}
function actionButton(text,kind,id){
  const b=document.createElement("button");
  b.type="button";b.dataset.action=kind;b.dataset.id=id;b.textContent=text;b.className=kind==="delete"?"studio-delete":"studio-edit";return b;
}
function render(){
  const items=getRecords(),root=input("studio-products");
  root.replaceChildren();
  input("studio-count").textContent=items.length+" of "+MAX_ITEMS+" local demo products";
  if(!items.length){
    const p=document.createElement("p");p.className="studio-empty";
    p.textContent="No custom products in this browser yet. Create one using the form above.";
    root.append(p);return;
  }
  for(const item of items){
    const row=document.createElement("article");row.className="studio-product";
    const preview=document.createElement("div");preview.className="studio-product-image";preview.style.background=item.bg||"#e5e9da";
    if(item.imageData?.startsWith("data:image/jpeg;base64,")){
      const img=document.createElement("img");img.src=item.imageData;img.alt="";preview.append(img);
    }else{preview.textContent="📦"}
    const body=document.createElement("div");body.className="studio-product-main";
    const name=document.createElement("strong");name.textContent=item.name;
    const details=document.createElement("p");details.textContent=item.category+" · "+currency(item.price);
    body.append(name,details);
    const controls=document.createElement("div");controls.className="studio-product-actions";
    controls.append(actionButton("Edit","edit",item.id),actionButton("Remove","delete",item.id));
    row.append(preview,body,controls);root.append(row);
  }
}
function startEditing(id){
  const item=getRecords().find(i=>i.id===id);
  if(!item)return;
  field.id.value=item.id;field.name.value=item.name;field.category.value=item.category;
  field.price.value=String(item.price);field.description.value=item.description||"";
  field.color.value=item.bg||"#e5e9da";field.photo.value="";field.removePhoto.checked=false;
  input("studio-form-heading").textContent="Edit local product";
  input("studio-save").textContent="Save changes";
  tell("Editing "+item.name+". The existing picture is retained unless you upload a replacement or select Remove picture.");
  form.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  field.name.focus();
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const button=input("studio-save");button.disabled=true;
  try{
    const name=field.name.value.trim(),category=field.category.value,
      price=Number(field.price.value),description=field.description.value.trim();
    if(name.length<2||name.length>70||!allowed.includes(category)||
       !Number.isSafeInteger(price)||price<1||price>10000000||description.length>500){
      throw Error("Check the product name, category, price and description.");
    }
    let all=getRecords();
    const old=all.find(x=>x.id===field.id.value);
    if(!old&&all.length>=MAX_ITEMS)throw Error("The prototype supports up to 16 local products. Remove one to make space.");
    let imageData=old?.imageData||"";
    if(field.removePhoto.checked)imageData="";
    if(field.photo.files[0])imageData=await encodePhoto(field.photo.files[0]);
    const item={
      id:old?.id||makeId(),name,category,price,description,
      emoji:"📦",bg:field.color.value,imageData
    };
    if(old)all=all.map(x=>x.id===old.id?item:x);else all.push(item);
    saveRecords(all);
    cleanForm();
    render();
    tell(name+" saved locally. Open Shop in this browser to see it. Other devices will not see this change.");
  }catch(error){tell(error.message||"Unable to save this product.",true)}
  finally{button.disabled=false}
});
form.addEventListener("reset",()=>{
  field.id.value="";input("studio-form-heading").textContent="New sample product";
  input("studio-save").textContent="Save product locally";
});
input("studio-products").addEventListener("click",event=>{
  const button=event.target.closest("button[data-action]");
  if(!button)return;
  if(button.dataset.action==="edit"){startEditing(button.dataset.id);return}
  if(button.dataset.action==="delete"){
    const all=getRecords(),item=all.find(i=>i.id===button.dataset.id);
    if(!item)return;
    if(!window.confirm("Remove "+item.name+" from this browser's demo catalogue?"))return;
    try{
      saveRecords(all.filter(i=>i.id!==item.id));
      if(field.id.value===item.id)cleanForm();
      render();tell(item.name+" removed from local drafts.");
    }catch(error){tell(error.message,true)}
  }
});
input("studio-export").addEventListener("click",()=>{
  const data=JSON.stringify({type:"cedar-clay-local-demo",version:1,exportedAt:new Date().toISOString(),items:getRecords()},null,2);
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
  anchor.href=url;anchor.download="cedar-clay-local-products.json";document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  tell("JSON backup downloaded. It is a local export, not a live catalogue publish.");
});
render();
})();
