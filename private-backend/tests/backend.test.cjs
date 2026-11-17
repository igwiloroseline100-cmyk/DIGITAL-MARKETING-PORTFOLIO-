"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawn}=require("node:child_process");
const C=require("../../atelier-noor/assets/booking-core.js");
const serverFile=path.resolve(__dirname,"../server.cjs");
const json=(url,value,options={})=>fetch(url,{method:"POST",headers:{"content-type":"application/json",...(options.cookie?{cookie:options.cookie}:{})},body:JSON.stringify(value),redirect:"manual"});
const form=(url,value,cookie)=>fetch(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",...(cookie?{cookie}:{})},body:new URLSearchParams(value),redirect:"manual"});
function futureDate(){const base=C.lagosNow().date;for(let i=1;i<=14;i++){const dt=new Date(Date.parse(base+"T00:00:00Z")+i*86400000).toISOString().slice(0,10);if(C.validDate(dt,base))return dt}throw Error("No future open day")}
async function start(tmp){
 const child=spawn(process.execPath,[serverFile],{env:{...process.env,ADMIN_PASSWORD:"long-private-test-password-2026",DATA_FILE:path.join(tmp,"records.json"),HOST:"127.0.0.1",PORT:"0"},stdio:["ignore","pipe","pipe"]});
 let stderr="";
 child.stderr.on("data",data=>stderr+=data);
 const port=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error("Server startup timeout: "+stderr)),8000);
  let output="";
  child.stdout.on("data",chunk=>{output+=chunk;const match=output.match(/listening at http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]))}});
  child.on("exit",code=>{clearTimeout(timer);reject(Error("Server exited: "+code+" "+stderr))});
 });
 return {child,url:"http://127.0.0.1:"+port};
}
test("private backend enforces login and supports BOTH business demo workflows",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"owner-prototype-"));
 let child;
 try {
  const instance=await start(dir);child=instance.child;const base=instance.url;
  let response=await fetch(base+"/api/admin/state");assert.equal(response.status,401);
  response=await fetch(base+"/admin");assert.equal(response.status,200);assert.match(await response.text(),/Owner password/);
  response=await form(base+"/login",{password:"wrong-password"});assert.equal(response.status,401);
  response=await form(base+"/login",{password:"long-private-test-password-2026"});assert.equal(response.status,303);
  const cookie=response.headers.get("set-cookie").split(";")[0];assert.match(cookie,/^noor_owner=/);
  response=await fetch(base+"/api/admin/state",{headers:{cookie}});assert.equal(response.status,200);
  let state=await response.json();assert.equal(state.products.length,28);assert.equal(state.orders.length,0);
  response=await form(base+"/admin/products",{name:"Sample Ceramic Bowl",category:"Kitchen",price:"14900"},cookie);assert.equal(response.status,303);
  response=await fetch(base+"/api/public/catalog");assert.equal(response.status,200);
  const catalog=await response.json();assert.equal(catalog.length,29);
  response=await json(base+"/api/public/orders",{paymentMethod:"card",items:[{id:"everyday-mug",qty:2}]});assert.equal(response.status,201);
  const order=await response.json();assert.equal(order.total,19000);assert.match(order.reference,/^CC-DEMO-/);
  response=await form(base+"/admin/orders/"+order.reference+"/status",{status:"Scheduled",shippingDate:""},cookie);assert.equal(response.status,400);
  response=await form(base+"/admin/orders/"+order.reference+"/status",{status:"Scheduled",shippingDate:"2026-12-05"},cookie);assert.equal(response.status,303);
  const date=futureDate();
  response=await json(base+"/api/public/bookings",{guest:"Sample Visitor",serviceId:"braids",date,time:"10:00"});assert.equal(response.status,201);
  const booking=await response.json();
  response=await json(base+"/api/public/bookings",{guest:"Sample Visitor Two",serviceId:"manicure",date,time:"11:00"});assert.equal(response.status,409);
  response=await form(base+"/admin/bookings/"+booking.reference+"/update",{status:"Confirmed",date,time:"10:00"},cookie);assert.equal(response.status,303);
  response=await fetch(base+"/api/admin/state",{headers:{cookie}});state=await response.json();
  assert.equal(state.orders[0].status,"Scheduled");assert.equal(state.bookings[0].status,"Confirmed");
  response=await fetch(base+"/api/admin/state",{headers:{origin:"https://other.example",cookie}});assert.equal(response.status,200);
  response=await fetch(base+"/admin",{headers:{cookie}});assert.match(await response.text(),/Business management console/);
  response=await form(base+"/logout",{},cookie);assert.equal(response.status,303);
  response=await fetch(base+"/api/admin/state",{headers:{cookie}});assert.equal(response.status,401);
  assert.ok(fs.existsSync(path.join(dir,"records.json")));
 } finally {if(child)child.kill();fs.rmSync(dir,{recursive:true,force:true})}
});
test("public preview pages cannot execute owner actions",()=>{
 const root=path.resolve(__dirname,"../..");
 for(const p of ["cedar-clay-store/order-studio.html","cedar-clay-store/catalog-studio.html","atelier-noor/studio.html"]){
  const html=fs.readFileSync(path.join(root,p),"utf8");
  assert.match(html,/Owner system preview/i);
  assert.match(html,/read.only/i);
  assert.doesNotMatch(html,/<form\b/i);
  assert.doesNotMatch(html,/data-save=|data-action="delete"|id="demo-admin-orders"|id="dashboard-bookings"|id="studio-form"/);
 }
});
