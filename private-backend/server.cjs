"use strict";
/* Private owner-side API prototype for TWO fictional portfolio demos.
   Runs on a separate Node server, NEVER on GitHub Pages. */
const http=require("node:http");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const vm=require("node:vm");
const C=require("../atelier-noor/assets/booking-core.js");
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"";
if(ADMIN_PASSWORD.length<12){console.error("Set ADMIN_PASSWORD (12+ characters) before running this owner server.");process.exit(1)}
const DATA_FILE=path.resolve(process.env.DATA_FILE||path.join(__dirname,"data","demo.json"));
const HOST=process.env.HOST||"127.0.0.1",PORT=Number(process.env.PORT||3000);
const secretSalt=crypto.randomBytes(32);
const passwordDigest=crypto.scryptSync(ADMIN_PASSWORD,secretSalt,64);
const sessions=new Map(),attempts=new Map(),TTL=4*60*60*1000;
const statuses=["Received","Processing","Scheduled","Shipped","Delivered"];
const bookingStatuses=["Requested","Confirmed","Completed","Cancelled"];
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const id=prefix=>prefix+crypto.randomUUID().toUpperCase();
function seedProducts(){
 const code=fs.readFileSync(path.join(__dirname,"../cedar-clay-store/assets/catalog.js"),"utf8");
 const ctx={window:{},localStorage:{getItem:()=>null}};
 vm.runInNewContext(code,ctx,{timeout:800});
 return JSON.parse(JSON.stringify(ctx.window.CC_BASE_CATALOG)).map(p=>({id:p.id,name:p.name,category:p.category,price:p.price}));
}
function initial(){return {products:seedProducts(),orders:[],bookings:[]}}
function load(){
 if(!fs.existsSync(DATA_FILE))return initial();
 const parsed=JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
 if(!Array.isArray(parsed.orders)||!Array.isArray(parsed.bookings)||!Array.isArray(parsed.products))throw Error("Invalid server data file");
 return parsed;
}
let state=load();
function persist(){
 fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true,mode:0o700});
 const tmp=DATA_FILE+"."+process.pid+".tmp";
 fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600});
 fs.renameSync(tmp,DATA_FILE);
}
const reply=(res,status,body,type="application/json; charset=utf-8")=>{
 res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(type.startsWith("application/json")?JSON.stringify(body):body);
};
const json=(res,status,data)=>reply(res,status,data);
const html=(res,body,status=200)=>reply(res,status,body,"text/html; charset=utf-8");
const redirect=(res,url,cookie)=>{res.writeHead(303,{"Location":url,"Cache-Control":"no-store",...(cookie?{"Set-Cookie":cookie}:{})});res.end()};
function cookies(req){return Object.fromEntries((req.headers.cookie||"").split(";").map(x=>x.trim().split("=")).filter(x=>x.length===2))}
function authorized(req){const token=cookies(req).noor_owner;const s=token&&sessions.get(token);if(!s||s<Date.now()){if(token)sessions.delete(token);return false}return true}
function cookie(token,maxAge){return "noor_owner="+token+"; HttpOnly; SameSite=Strict; Path=/; Max-Age="+maxAge+(process.env.NODE_ENV==="production"?"; Secure":"")}
function page(title,body){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+escapeHtml(title)+'</title><style>body{font-family:system-ui,Arial;background:#f6f4f1;color:#202729;line-height:1.5;margin:0;padding:30px}.wrap{max-width:1000px;margin:auto}.panel{background:#fff;border:1px solid #e2ddd4;border-radius:18px;padding:24px;margin:18px 0}h1,h2{line-height:1.15}label{display:block;font-size:.87rem;margin:10px 0}input,select,button{font:inherit;padding:9px;border:1px solid #bbc4c7;border-radius:8px;max-width:100%}button{background:#193d3c;color:white;cursor:pointer;border:0}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd;vertical-align:top}form.inline{display:flex;gap:7px;align-items:center;flex-wrap:wrap}small,.muted{color:#566466}.scroll{overflow-x:auto}a{color:#185954}</style></head><body><main class="wrap">'+body+'</main></body></html>'}
function loginPage(message=""){
 return page("Private owner sign-in",'<div class="panel"><p>PRIVATE • SERVER-ONLY PROTOTYPE</p><h1>Owner systems</h1><p>This administrative interface is separate from both publicly hosted portfolio demos. Sign-in is required for owner operations.</p>'+(message?'<p role="alert">'+escapeHtml(message)+'</p>':"")+'<form method="post" action="/login"><label>Owner password <input type="password" name="password" minlength="12" required autocomplete="current-password"></label><button type="submit">Sign in</button></form></div>');
}
function pick(service){return C.serviceById(service)||null}
function adminPage(){
 const orders=state.orders.map(o=>'<tr><td>'+escapeHtml(o.id)+'</td><td>'+escapeHtml(o.items.map(i=>i.name+" ×"+i.qty).join(", "))+'</td><td>₦'+o.total.toLocaleString("en-NG")+'</td><td><form class="inline" method="post" action="/admin/orders/'+encodeURIComponent(o.id)+'/status"><select name="status">'+statuses.map(s=>'<option '+(s===o.status?"selected":"")+'>'+s+'</option>').join("")+'</select><input name="shippingDate" type="date" value="'+escapeHtml(o.shippingDate||"")+'" aria-label="Example shipping date"><button>Save</button></form></td></tr>').join("")||'<tr><td colspan="4">No sample server-side orders yet.</td></tr>';
 const books=state.bookings.map(b=>'<tr><td>'+escapeHtml(b.id)+'</td><td>'+escapeHtml(b.guest)+'</td><td>'+escapeHtml(pick(b.serviceId)?.name||"")+'</td><td><form class="inline" method="post" action="/admin/bookings/'+encodeURIComponent(b.id)+'/update"><select name="status">'+bookingStatuses.map(s=>'<option '+(s===b.status?"selected":"")+'>'+s+'</option>').join("")+'</select><input type="date" name="date" value="'+escapeHtml(b.date)+'" required><input name="time" type="time" value="'+escapeHtml(b.time)+'" required><button>Save</button></form></td></tr>').join("")||'<tr><td colspan="4">No sample server-side appointments yet.</td></tr>';
 const prods=state.products.slice(0,35).map(p=>'<tr><td>'+escapeHtml(p.id)+'</td><td>'+escapeHtml(p.name)+'</td><td>₦'+Number(p.price).toLocaleString("en-NG")+'</td><td><form method="post" action="/admin/products/'+encodeURIComponent(p.id)+'/delete"><button type="submit">Remove sample</button></form></td></tr>').join("");
 return page("Owner console — private prototype",'<header><p>PRIVATE BACK OFFICE • SERVER-SIDE PASSWORD REQUIRED</p><h1>Business management console</h1><p>Separate modules for Cedar & Clay orders/catalogue and Atelier Noor bookings. Demonstration records only. No live payments or messages.</p><form method="post" action="/logout"><button>Sign out</button></form></header><section class="panel"><h2>Cedar &amp; Clay — order fulfilment</h2><div class="scroll"><table><tr><th>Reference</th><th>Items</th><th>Demo total</th><th>Status / shipping</th></tr>'+orders+'</table></div></section><section class="panel"><h2>Atelier Noor — appointment diary</h2><div class="scroll"><table><tr><th>Reference</th><th>Sample guest</th><th>Service</th><th>Status / schedule</th></tr>'+books+'</table></div></section><section class="panel"><h2>Cedar &amp; Clay — product catalogue</h2><form class="inline" method="post" action="/admin/products"><label>Product <input name="name" minlength="2" maxlength="70" required></label><label>Category <select name="category"><option>Decor</option><option>Desk</option><option>Kitchen</option><option>Textiles</option></select></label><label>Demo price (₦) <input name="price" type="number" min="1" max="10000000" required></label><button>Add product</button></form><small>Server-side catalogue: '+state.products.length+' sample items.</small><div class="scroll"><table><tr><th>ID</th><th>Name</th><th>Price</th><th>Action</th></tr>'+prods+'</table></div></section>');
}
const originalHost=req=>{const header=req.headers.host||"";return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(header) || (process.env.PUBLIC_ORIGIN&&new URL(process.env.PUBLIC_ORIGIN).host===header)};
const originOk=req=>{if(!req.headers.origin)return true;try{return new URL(req.headers.origin).host===req.headers.host}catch{return false}};
async function bodyData(req){
 let raw="";for await(const part of req){raw+=part.toString();if(raw.length>16000)throw Error("Request too large")}
 const t=req.headers["content-type"]||"";
 if(t.includes("application/json"))return JSON.parse(raw||"{}");
 if(t.includes("application/x-www-form-urlencoded"))return Object.fromEntries(new URLSearchParams(raw));
 throw Error("Use JSON or an HTML form");
}
function err(res,why,status=400){return json(res,status,{error:why})}
function idSuffix(reqPath,prefix,suffix){const a=reqPath.match(new RegExp("^"+prefix+"(/[^/]+)"+suffix+"$"));return a?decodeURIComponent(a[1].slice(1)):null}
function applyProduct(input){
 const name=String(input.name||"").trim(),price=Number(input.price),category=String(input.category||"");
 if(name.length<2||name.length>70||!Number.isSafeInteger(price)||price<1||price>10000000||!["Decor","Desk","Kitchen","Textiles"].includes(category))return null;
 return {id:"demo-"+crypto.randomBytes(8).toString("hex"),name,category,price};
}
const purge=()=>{for(const [t,expiry] of sessions)if(expiry<Date.now())sessions.delete(t)};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||"/","http://localhost"),p=url.pathname,method=req.method;
  if(!originalHost(req))return err(res,"Unrecognised host",403);
  if(method==="POST"&&!originOk(req))return err(res,"Cross-origin changes are blocked",403);
  if(method==="GET"&&p==="/health")return json(res,200,{status:"ok",mode:"private demo backend"});
  if(method==="GET"&&p==="/api/public/services")return json(res,200,C.SERVICES);
  if(method==="GET"&&p==="/api/public/catalog")return json(res,200,state.products);
  if(method==="GET"&&p==="/")return redirect(res,"/admin");
  if(method==="GET"&&p==="/admin")return html(res,authorized(req)?adminPage():loginPage());
  if(method==="POST"&&p==="/login"){
   const key=req.socket.remoteAddress||"local",recent=attempts.get(key)||[];
   const within=recent.filter(x=>Date.now()-x<10*60*1000);
   if(within.length>=5)return html(res,loginPage("Too many attempts. Retry later."),429);
   const input=await bodyData(req);const entered=crypto.scryptSync(String(input.password||""),secretSalt,64);
   if(!crypto.timingSafeEqual(entered,passwordDigest)){within.push(Date.now());attempts.set(key,within);return html(res,loginPage("Incorrect password."),401)}
   attempts.delete(key);purge();const token=crypto.randomBytes(32).toString("hex");sessions.set(token,Date.now()+TTL);
   return redirect(res,"/admin",cookie(token,TTL/1000));
  }
  if(method==="POST"&&p==="/logout"){const t=cookies(req).noor_owner;if(t)sessions.delete(t);return redirect(res,"/admin",cookie("",0))}
  if(method==="POST"&&p==="/api/public/bookings"){
   const input=await bodyData(req);
   if(state.bookings.length>=250)return err(res,"Demo booking capacity reached",409);
   const result=C.createBooking({serviceId:input.serviceId,date:input.date,time:input.time,guest:input.guest},state.bookings);
   if(!result.ok)return err(res,result.error,409);
   state.bookings.push(result.booking);persist();
   return json(res,201,{reference:result.booking.id,status:result.booking.status,date:result.booking.date,time:result.booking.time,notice:"Fictional server-side booking, no real appointment"});
  }
  if(method==="POST"&&p==="/api/public/orders"){
   const input=await bodyData(req),methodChosen=input.paymentMethod;
   if(!["card","transfer","delivery"].includes(methodChosen)||!Array.isArray(input.items)||!input.items.length||input.items.length>30)return err(res,"Invalid demo order");
   const items=[];for(const row of input.items){const product=state.products.find(x=>x.id===row.id),qty=Number(row.qty);if(!product||!Number.isSafeInteger(qty)||qty<1||qty>999)return err(res,"Invalid product or quantity");items.push({id:product.id,name:product.name,price:product.price,qty})}
   if(state.orders.length>=250)return err(res,"Demo order capacity reached",409);
   const total=items.reduce((n,i)=>n+i.price*i.qty,0);
   const order={id:id("CC-DEMO-"),items,total,status:"Received",shippingDate:"",paymentMethod:methodChosen,paymentStatus:"Simulation only — no money moved",createdAt:new Date().toISOString()};
   state.orders.push(order);persist();return json(res,201,{reference:order.id,total,status:order.status,notice:"No real order or payment"});
  }
  const privateEndpoint=p.startsWith("/api/admin/")||p.startsWith("/admin/");
  if(privateEndpoint&&!authorized(req))return err(res,"Owner sign-in required",401);
  if(method==="GET"&&p==="/api/admin/state")return json(res,200,state);
  const orderId=idSuffix(p,"/admin/orders","/status");
  if(method==="POST"&&orderId){
   const input=await bodyData(req),o=state.orders.find(x=>x.id===orderId);
   if(!o)return err(res,"Order not found",404);
   if(!statuses.includes(input.status))return err(res,"Invalid status");
   const ship=String(input.shippingDate||"");
   if(["Scheduled","Shipped","Delivered"].includes(input.status)&&!(/^\d{4}-\d{2}-\d{2}$/.test(ship)&&Number.isFinite(Date.parse(ship))))return err(res,"Add an example shipping date");
   o.status=input.status;o.shippingDate=ship;persist();return redirect(res,"/admin");
  }
  const bookingId=idSuffix(p,"/admin/bookings","/update");
  if(method==="POST"&&bookingId){
   const input=await bodyData(req);
   const updated=C.updateBooking(state.bookings,bookingId,{status:input.status,date:input.date,time:input.time});
   if(!updated.ok)return err(res,updated.error,409);
   state.bookings=updated.records;persist();return redirect(res,"/admin");
  }
  if(method==="POST"&&p==="/admin/products"){
   const input=await bodyData(req),item=applyProduct(input);
   if(!item)return err(res,"Invalid product");
   if(state.products.length>=80)return err(res,"Catalogue demo limit reached",409);
   state.products.push(item);persist();return redirect(res,"/admin");
  }
  const productId=idSuffix(p,"/admin/products","/delete");
  if(method==="POST"&&productId){
   if(!state.products.some(x=>x.id===productId))return err(res,"Product not found",404);
   state.products=state.products.filter(x=>x.id!==productId);persist();return redirect(res,"/admin");
  }
  return err(res,"Not found",404);
 }catch(e){return err(res,/Request too large/.test(e.message)?"Request too large":"Invalid request",400)}
});
server.listen(PORT,HOST,()=>{const address=server.address();console.log("Private owner backend listening at http://"+HOST+":"+address.port)});
module.exports=server;
