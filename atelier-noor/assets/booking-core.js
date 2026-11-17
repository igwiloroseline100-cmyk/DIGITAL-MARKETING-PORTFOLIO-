/* Atelier Noor booking model. All state is sample data stored in this browser. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.NOOR_CORE=api;
})(typeof window!=="undefined"?window:null,function(){
"use strict";
const KEY="atelier-noor-demo-bookings-v1";
const SERVICES=[
 {id:"braids",category:"Hair",name:"Signature Braids",duration:120,price:22000,icon:"✳",tone:"peach",detail:"Neat, expressive braids with a relaxed finishing session."},
 {id:"wash",category:"Hair",name:"Wash & Silk Styling",duration:60,price:12000,icon:"〰",tone:"lavender",detail:"A refreshing wash and a smooth, considered finish."},
 {id:"manicure",category:"Nails",name:"Modern Gel Manicure",duration:75,price:10000,icon:"◈",tone:"rose",detail:"Cuticle care, shape and polish in your chosen shade."},
 {id:"makeup",category:"Makeup",name:"Signature Soft Glam",duration:90,price:28000,icon:"✧",tone:"gold",detail:"A luminous makeup look made for your occasion."},
 {id:"facial",category:"Skin",name:"Glow Refresh Facial",duration:60,price:18000,icon:"☼",tone:"sage",detail:"A gentle skincare ritual and rejuvenating reset."},
 {id:"brows",category:"Beauty",name:"Brow Design",duration:30,price:6500,icon:"⌁",tone:"cream",detail:"Thoughtful shaping for beautifully balanced brows."}
];
const OPEN=10*60,CLOSE=18*60,STEP=30,MAX_DAYS=60;
const serviceById=id=>SERVICES.find(s=>s.id===id)||null;
const toMinutes=time=>typeof time==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3)):NaN;
const toClock=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const dateKey=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date))?date:"";
const dateUTC=date=>{if(!dateKey(date))return NaN;const y=Number(date.slice(0,4)),m=Number(date.slice(5,7)),d=Number(date.slice(8,10));const utc=Date.UTC(y,m-1,d);return new Date(utc).toISOString().slice(0,10)===date?utc:NaN};
const lagosNow=(when=new Date())=>{
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(when);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return {date:p.year+"-"+p.month+"-"+p.day,minute:Number(p.hour)*60+Number(p.minute)};
};
function validDate(date,today=lagosNow().date){
 const point=dateUTC(date),base=dateUTC(today);
 if(!Number.isFinite(point)||!Number.isFinite(base)||point<base||point>base+MAX_DAYS*86400000)return false;
 const day=new Date(point).getUTCDay();
 return day!==0&&day!==1; // Tuesday to Saturday
}
function normalize(records){
 if(!Array.isArray(records))return [];
 const seen=new Set(),output=[];
 for(const record of records.slice(0,150)){
  if(!record||typeof record!=="object"||!/^AN-[A-Z0-9-]{8,45}$/.test(record.id||"")||seen.has(record.id))continue;
  if(!serviceById(record.serviceId)||!Number.isFinite(dateUTC(record.date))||!Number.isFinite(toMinutes(record.time)))continue;
  seen.add(record.id);output.push({
    id:record.id,guest:String(record.guest||"Sample Guest").slice(0,50),
    serviceId:record.serviceId,date:record.date,time:record.time,
    status:["Requested","Confirmed","Completed","Cancelled"].includes(record.status)?record.status:"Requested",
    createdAt:String(record.createdAt||""),updatedAt:String(record.updatedAt||"")
  });
 }
 return output;
}
function isBlocked(serviceId,date,time,records=[],excludeId=""){
 const service=serviceById(serviceId);if(!service)return true;
 const start=toMinutes(time);if(!Number.isFinite(start)||start<OPEN||start+service.duration>CLOSE||start%STEP!==0)return true;
 return records.some(b=>{
  if(b.id===excludeId||b.date!==date||b.status==="Cancelled"||b.status==="Completed")return false;
  const booked=serviceById(b.serviceId),other=toMinutes(b.time);
  return booked&&Number.isFinite(other)&&start<other+booked.duration&&other<start+service.duration;
 });
}
function availableSlots(serviceId,date,records=[],now=lagosNow()){
 if(!serviceById(serviceId)||!validDate(date,now.date))return [];
 const slots=[];
 for(let n=OPEN;n+serviceById(serviceId).duration<=CLOSE;n+=STEP){
  if(date===now.date&&n<=now.minute)continue;
  if(!isBlocked(serviceId,date,toClock(n),records))slots.push(toClock(n));
 }
 return slots;
}
function createBooking(input,records=[],now=lagosNow(),id){
 const service=serviceById(input?.serviceId),guest=String(input?.guest||"").trim(),date=String(input?.date||""),time=String(input?.time||"");
 if(!service)return {ok:false,error:"Choose one of the listed services."};
 if(guest.length<2||guest.length>50)return {ok:false,error:"Use a sample guest name between 2 and 50 characters."};
 if(!validDate(date,now.date))return {ok:false,error:"Choose a Tuesday–Saturday appointment within the next 60 days."};
 if(!availableSlots(service.id,date,records,now).includes(time))return {ok:false,error:"This time is no longer available. Choose another slot."};
 const ref=id||"AN-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();
 return {ok:true,booking:{id:ref,guest,serviceId:service.id,date,time,status:"Requested",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}};
}
function updateBooking(records,id,values,now=lagosNow()){
 const index=records.findIndex(b=>b.id===id);
 if(index<0)return {ok:false,error:"Booking not found."};
 const old=records[index];
 const next={...old};
 if(values.status!==undefined){
   if(!["Requested","Confirmed","Completed","Cancelled"].includes(values.status))return {ok:false,error:"Invalid status."};
   next.status=values.status;
 }
 if(values.date!==undefined||values.time!==undefined){
   next.date=values.date??old.date;next.time=values.time??old.time;
   if(!validDate(next.date,now.date))return {ok:false,error:"Choose a valid future booking day."};
   if(!availableSlots(next.serviceId,next.date,records.filter(x=>x.id!==id),now).includes(next.time))return {ok:false,error:"The selected rescheduling slot conflicts or is unavailable."};
 }
 if(["Requested","Confirmed"].includes(next.status)&&next.date===old.date&&next.time===old.time&&isBlocked(next.serviceId,next.date,next.time,records,id))
   return {ok:false,error:"This slot now conflicts with another booking."};
 next.updatedAt=new Date().toISOString();
 const updated=records.slice();updated[index]=next;return {ok:true,records:updated,booking:next};
}
return {KEY,SERVICES,OPEN,CLOSE,STEP,MAX_DAYS,serviceById,toMinutes,toClock,lagosNow,validDate,normalize,availableSlots,createBooking,updateBooking,isBlocked};
});
