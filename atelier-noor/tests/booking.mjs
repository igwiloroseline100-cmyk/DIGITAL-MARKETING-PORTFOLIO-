import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import vm from "node:vm";
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const C=require(path.join(dir,"assets/booking-core.js"));
const read=p=>fs.readFileSync(path.join(dir,p),"utf8");
const now={date:"2026-11-17",minute:8*60};
const sample=(serviceId="braids",date="2026-11-18",time="10:00")=>({serviceId,date,time,guest:"Sample Guest"});

test("booking model loads and has complete service definitions",()=>{
 assert.equal(C.SERVICES.length,6);
 for(const s of C.SERVICES){
  assert.ok(s.name.length>4);
  assert.ok(s.duration>0&&s.duration<=180);
  assert.ok(s.price>0);
 }
 assert.doesNotThrow(()=>new vm.Script(read("assets/app.js")));
});

test("opening days, date bounds and time checks are enforced",()=>{
 assert.equal(C.validDate("2026-11-17",now.date),true);
 assert.equal(C.validDate("2026-11-18",now.date),true);
 assert.equal(C.validDate("2026-11-22",now.date),false); // Sunday
 assert.equal(C.validDate("2026-11-23",now.date),false); // Monday
 assert.equal(C.validDate("2026-11-16",now.date),false); // past
 assert.equal(C.validDate("2027-03-01",now.date),false);
 assert.equal(C.validDate("2026-13-11",now.date),false);
 assert.equal(C.availableSlots("braids","2026-11-22",[],now).length,0);
 const slots=C.availableSlots("braids","2026-11-18",[],now);
 assert.equal(slots[0],"10:00");
 assert.equal(slots.at(-1),"16:00");
 assert.equal(slots.includes("16:30"),false);
});

test("booking duration blocks overlapping service slots",()=>{
 const created=C.createBooking(sample(),[],now,"AN-EXAMPLE-12345678");
 assert.equal(created.ok,true);
 const list=[created.booking];
 assert.equal(C.isBlocked("manicure","2026-11-18","11:00",list),true);
 assert.equal(C.isBlocked("manicure","2026-11-18","11:30",list),true);
 assert.equal(C.isBlocked("manicure","2026-11-18","12:00",list),false);
 assert.equal(C.availableSlots("manicure","2026-11-18",list,now).includes("11:00"),false);
 assert.equal(C.createBooking(sample("manicure","2026-11-18","11:00"),list,now).ok,false);
 assert.equal(C.createBooking(sample("manicure","2026-11-18","12:00"),list,now).ok,true);
});

test("only eligible times and fictional guest names are accepted",()=>{
 assert.equal(C.createBooking({...sample(),guest:"X"},[],now).ok,false);
 assert.equal(C.createBooking({...sample(),time:"18:00"},[],now).ok,false);
 assert.equal(C.createBooking({...sample(),time:"09:30"},[],now).ok,false);
 assert.equal(C.createBooking({...sample(),time:"10:15"},[],now).ok,false);
 assert.equal(C.createBooking({...sample(),date:"2026-11-22"},[],now).ok,false);
});

test("owner status changes and customer cancellations correctly release slots",()=>{
 const booking=C.createBooking(sample(),[],now,"AN-EXAMPLE-12345678").booking;
 let list=[booking];
 assert.equal(C.updateBooking(list,booking.id,{status:"Confirmed"},now).ok,true);
 list=C.updateBooking(list,booking.id,{status:"Confirmed"},now).records;
 assert.equal(list[0].status,"Confirmed");
 assert.equal(C.availableSlots("braids",booking.date,list,now).includes("10:00"),false);
 const cancelled=C.updateBooking(list,booking.id,{status:"Cancelled"},now);
 assert.equal(cancelled.ok,true);
 assert.equal(C.availableSlots("braids",booking.date,cancelled.records,now).includes("10:00"),true);
});

test("owner rescheduling respects overlaps, and changes appear in sample data",()=>{
 const first=C.createBooking(sample(),[],now,"AN-EXAMPLE-AAA12345").booking;
 const second=C.createBooking(sample("manicure","2026-11-18","12:00"),[first],now,"AN-EXAMPLE-BBB12345").booking;
 const records=[first,second];
 const conflict=C.updateBooking(records,second.id,{date:"2026-11-18",time:"11:00"},now);
 assert.equal(conflict.ok,false);
 const success=C.updateBooking(records,second.id,{date:"2026-11-19",time:"13:30",status:"Confirmed"},now);
 assert.equal(success.ok,true);
 assert.equal(success.records[1].date,"2026-11-19");
 assert.equal(success.records[1].time,"13:30");
 assert.equal(success.records[1].status,"Confirmed");
 assert.equal(records[1].date,"2026-11-18");
});

test("all independent pages are present and link to the scripts",()=>{
 const pages=["index.html","services.html","book.html","my-bookings.html","studio.html"];
 for(const name of pages){
  const html=read(name);
  assert.match(html,/<title>[^<]+<\/title>/,name);
  assert.match(html,/FICTIONAL BEAUTY STUDIO/,name);
  if(name!=="studio.html"){
   assert.match(html,/src="assets\/booking-core\.js"/,name);
   assert.match(html,/src="assets\/app\.js"/,name);
  }
  assert.match(html,/href="services\.html"/,name);
  assert.match(html,/href="book\.html"/,name);
  if(name!=="studio.html")assert.match(html,/href="studio\.html"/,name);
  assert.match(html,/no real/i,name);
 }
 assert.match(read("services.html"),/id="service-filter"/);
 assert.match(read("book.html"),/id="booking-form"/);
 assert.match(read("book.html"),/id="slots"/);
 assert.match(read("my-bookings.html"),/id="customer-bookings"/);
 assert.match(read("studio.html"),/Owner system preview/);
 assert.match(read("studio.html"),/read.only/i);
 assert.doesNotMatch(read("studio.html"),/id="dashboard-bookings"/);
});

test("no payment collection, external customer API or fake AI claims are wired",()=>{
 const code=read("assets/app.js");
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
 assert.match(read("index.html"),/scripted demonstration, not AI/);
 assert.match(read("book.html"),/Use a fictional guest name/);
});
