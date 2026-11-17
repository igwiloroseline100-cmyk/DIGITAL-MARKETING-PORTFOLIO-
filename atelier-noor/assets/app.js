/* Atelier Noor — interactive, browser-local portfolio demonstration. */
(function(){
"use strict";
const C=window.NOOR_CORE;if(!C)return;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
const esc=x=>String(x??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
const friendly=d=>{const t=new Date(d+"T12:00:00Z");return Number.isNaN(t.getTime())?d:new Intl.DateTimeFormat("en-NG",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(t)};
const friendlyClock=x=>{const n=C.toMinutes(x);return Number.isFinite(n)?new Intl.DateTimeFormat("en-NG",{hour:"numeric",minute:"2-digit",timeZone:"UTC"}).format(new Date(Date.UTC(2020,0,1,0,n))):x};
const STORE=C.KEY;let memory=[];
function read(){try{const s=localStorage.getItem(STORE);return C.normalize(s?JSON.parse(s):[])}catch{return C.normalize(memory)}}
function write(list){const safe=C.normalize(list);localStorage.setItem(STORE,JSON.stringify(safe));memory=safe}
function setFeedback(node,text,isError=false){if(!node)return;node.textContent=text;node.hidden=false;node.classList.toggle("error",isError);node.setAttribute("role",isError?"alert":"status")}
function serviceTile(service){
 return '<article class="service-card"><div class="service-visual '+service.tone+'"><span class="service-glyph" aria-hidden="true">'+esc(service.icon)+'</span><span class="visual-label">'+esc(service.category)+'</span></div><div class="service-body"><div class="service-top"><h3>'+esc(service.name)+'</h3><span>'+fmt(service.price)+'</span></div><p>'+esc(service.detail)+'</p><div class="service-foot"><small>'+service.duration+' min</small><a href="book.html?service='+encodeURIComponent(service.id)+'">Choose service <span aria-hidden="true">↗</span></a></div></div></article>';
}
function renderServices(){
 const list=$("[data-services]");if(!list)return;
 const show=list.dataset.services==="featured"?C.SERVICES.slice(0,3):C.SERVICES;
 list.innerHTML=show.map(serviceTile).join("");
 const filter=$("#service-filter");
 if(filter){
  filter.addEventListener("change",()=>{
   const subset=filter.value==="all"?C.SERVICES:C.SERVICES.filter(s=>s.category===filter.value);
   list.innerHTML=subset.map(serviceTile).join("");
   $("#service-count").textContent=subset.length+" sample services";
  });
 }
}
const addDays=(d,days)=>new Date(C.dateToUTC?C.dateToUTC(d)+days*86400000:Date.UTC(...d.split("-").map((x,i)=>Number(x)-(i===1?1:0)))+days*86400000).toISOString().slice(0,10);
function initBooking(){
 const form=$("#booking-form");if(!form)return;
 const service=$("#service"),date=$("#date"),slots=$("#slots"),guest=$("#guest"),summary=$("#booking-summary"),feedback=$("#booking-feedback"),button=$("#booking-submit");
 const today=C.lagosNow().date;date.min=today;date.max=addDays(today,60);
 service.innerHTML='<option value="">Select a service</option>'+C.SERVICES.map(s=>'<option value="'+s.id+'">'+esc(s.name)+' · '+fmt(s.price)+'</option>').join("");
 const requested=new URLSearchParams(location.search).get("service");
 if(C.serviceById(requested))service.value=requested;
 function update(){
  const s=C.serviceById(service.value);
  const existing=read(),possible=C.availableSlots(service.value,date.value,existing);
  const prior=slots.value;
  slots.innerHTML=possible.length?'<option value="">Choose available time</option>'+possible.map(x=>'<option value="'+x+'">'+friendlyClock(x)+'</option>').join(""):'<option value="">No time slots available</option>';
  if(possible.includes(prior))slots.value=prior;
  slots.disabled=!possible.length;
  summary.innerHTML=s?'<strong>'+esc(s.name)+'</strong><span>'+s.duration+' min · '+fmt(s.price)+'</span><p>Sample price only. No payment or appointment is actually taken.</p>':'Select a service to see the sample price and duration.';
  button.disabled=!s||!possible.length;
  if(service.value&&date.value&&!C.validDate(date.value))setFeedback(feedback,"The studio is open Tuesday–Saturday, 10 AM–6 PM (Lagos time). Choose a date within the next 60 days.",true);
  else feedback.hidden=true;
 }
 service.addEventListener("change",update);date.addEventListener("change",update);
 form.addEventListener("submit",event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const entries=read();
  const result=C.createBooking({serviceId:service.value,guest:guest.value,date:date.value,time:slots.value},entries);
  if(!result.ok){setFeedback(feedback,result.error,true);update();return}
  try{
   write([result.booking,...entries]);
   form.hidden=true;$("#booking-confirmation").hidden=false;
   const conf=$("#booking-confirmation");
   const s=C.serviceById(result.booking.serviceId);
   conf.innerHTML='<div class="confirm-symbol" aria-hidden="true">✓</div><p class="eyebrow">SAMPLE BOOKING RECORDED</p><h2>Time set aside. Just for the demo.</h2><p>Your fictional appointment request has been saved locally. It is <strong>not confirmed by a real salon.</strong></p><div class="confirmation-ticket"><div><span>Reference</span><strong>'+esc(result.booking.id)+'</strong></div><div><span>Service</span><strong>'+esc(s.name)+'</strong></div><div><span>When</span><strong>'+friendly(result.booking.date)+' · '+friendlyClock(result.booking.time)+'</strong></div><div><span>Status</span><strong>Requested — sample only</strong></div></div><div class="button-row"><a class="btn dark" href="my-bookings.html">Track sample booking ↗</a><a class="btn outline" href="book.html">Book another sample</a></div>';
   conf.focus();
  }catch{setFeedback(feedback,"Your browser blocked local storage. This sample booking could not be saved.",true)}
 });
 update();
}
function bookingMessage(b){
 const name=C.serviceById(b.serviceId)?.name||"service";
 if(b.status==="Cancelled")return "Preview: Your sample "+name+" appointment has been cancelled. No message was sent.";
 if(b.status==="Confirmed")return "Preview: Your sample "+name+" appointment on "+friendly(b.date)+" at "+friendlyClock(b.time)+" has been confirmed. No message was sent.";
 if(b.status==="Completed")return "Preview: Your sample "+name+" appointment is marked completed. No message was sent.";
 return "Preview: We received your sample appointment request. Our team is reviewing availability and will confirm the details. No message was sent.";
}
function bookingCard(b,owner=false){
 const s=C.serviceById(b.serviceId);
 const live=["Requested","Confirmed"].includes(b.status);
 let actions="";
 if(owner){
  actions='<div class="admin-form"><label>Status<select data-status="'+esc(b.id)+'">'+["Requested","Confirmed","Completed","Cancelled"].map(status=>'<option value="'+status+'" '+(b.status===status?"selected":"")+'>'+status+'</option>').join("")+'</select></label>'+
   '<label>Date<input type="date" data-date="'+esc(b.id)+'" value="'+esc(b.date)+'"></label>'+
   '<label>Time<select data-time="'+esc(b.id)+'"></select></label>'+
   '<button class="btn dark" type="button" data-save="'+esc(b.id)+'">Save changes</button></div><p class="booking-error" role="alert" data-error="'+esc(b.id)+'" hidden></p>';
 }else if(live){actions='<button type="button" class="text-action" data-cancel="'+esc(b.id)+'">Cancel this sample booking</button>';}
 return '<article class="booking-card" data-booking="'+esc(b.id)+'"><div class="booking-card-header"><div><span class="eyebrow">'+esc(s?.category||"Service")+' · SAMPLE</span><h3>'+esc(s?.name||"Service")+'</h3></div><span class="status status-'+b.status.toLowerCase()+'">'+esc(b.status)+'</span></div><p class="booking-reference">Ref: '+esc(b.id)+'</p><div class="booking-facts"><span><b>Guest</b> '+esc(b.guest)+'</span><span><b>Appointment</b> '+friendly(b.date)+' · '+friendlyClock(b.time)+'</span><span><b>Duration</b> '+(s?.duration||"—")+' min</span><span><b>Sample price</b> '+fmt(s?.price||0)+'</span></div>'+
 '<div class="message-preview"><strong>Customer notification preview</strong><p>'+esc(bookingMessage(b))+'</p></div>'+actions+'</article>';
}
function showBookings(owner){
 const root=owner?$("#dashboard-bookings"):$("#customer-bookings");if(!root)return;
 const list=read();const filter=owner?$("#status-filter")?.value||"all":"all";
 const view=filter==="all"?list:list.filter(b=>b.status===filter);
 if(owner){
  $("#stat-total").textContent=String(list.length);
  $("#stat-requested").textContent=String(list.filter(b=>b.status==="Requested").length);
  $("#stat-confirmed").textContent=String(list.filter(b=>b.status==="Confirmed").length);
  $("#stat-closed").textContent=String(list.filter(b=>["Cancelled","Completed"].includes(b.status)).length);
 }
 root.innerHTML=view.length?view.map(b=>bookingCard(b,owner)).join(""):'<div class="empty-state"><h3>No sample appointments here yet.</h3><p>Create an appointment request using the sample booking form to experience this flow.</p><a class="btn dark" href="book.html">Try booking ↗</a></div>';
 if(owner)for(const b of view){
  const card=root.querySelector('[data-booking="'+b.id+'"]');if(card)updateDashboardSlots(card,b);
 }
}
function updateDashboardSlots(card,booking){
 const date=card.querySelector("[data-date]"),time=card.querySelector("[data-time]");
 if(!date||!time)return;
 date.min=C.lagosNow().date;date.max=addDays(date.min,60);
 const current=read().find(b=>b.id===booking.id)||booking;
 const slots=C.availableSlots(current.serviceId,date.value,read().filter(x=>x.id!==booking.id));
 if(date.value===current.date&&!slots.includes(current.time))slots.unshift(current.time);
 time.innerHTML=slots.length?slots.map(t=>'<option value="'+t+'">'+friendlyClock(t)+'</option>').join(""):'<option value="">No slots available</option>';
 if(date.value===current.date&&slots.includes(current.time))time.value=current.time;
}
function initTracking(){
 const root=$("#customer-bookings");if(!root)return;
 root.addEventListener("click",event=>{
  const button=event.target.closest("[data-cancel]");if(!button)return;
  const records=read(),id=button.dataset.cancel,b=records.find(x=>x.id===id);
  if(!b||!["Requested","Confirmed"].includes(b.status))return;
  if(!window.confirm("Cancel this fictional booking? The slot will become available again in this browser."))return;
  const result=C.updateBooking(records,id,{status:"Cancelled"});
  if(result.ok){try{write(result.records);showBookings(false)}catch{alert("Browser storage could not save the change.")}}
 });
 showBookings(false);
}
function initDashboard(){
 const root=$("#dashboard-bookings");if(!root)return;
 $("#status-filter").addEventListener("change",()=>showBookings(true));
 root.addEventListener("change",event=>{
  const field=event.target.closest("[data-date]");if(!field)return;
  const card=field.closest("[data-booking]"),b=read().find(x=>x.id===card?.dataset.booking);
  if(b)updateDashboardSlots(card,b);
 });
 root.addEventListener("click",event=>{
  const button=event.target.closest("[data-save]");if(!button)return;
  const card=button.closest("[data-booking]"),id=card.dataset.booking,records=read(),old=records.find(b=>b.id===id);
  if(!old)return;
  const status=card.querySelector("[data-status]").value,date=card.querySelector("[data-date]").value,time=card.querySelector("[data-time]").value;
  const changes={status};
  if(date!==old.date||time!==old.time){changes.date=date;changes.time=time;}
  const result=C.updateBooking(records,id,changes);
  if(!result.ok){setFeedback(card.querySelector("[data-error]"),result.error,true);return;}
  try{write(result.records);showBookings(true);setFeedback($("#dashboard-feedback"),"Sample booking updated in this browser. No customer message was sent.");}
  catch{setFeedback(card.querySelector("[data-error]"),"Unable to save in this browser.",true)}
 });
 $("#clear-demo")?.addEventListener("click",()=>{
  if(!window.confirm("Permanently clear sample bookings from this browser?"))return;
  try{write([]);showBookings(true);setFeedback($("#dashboard-feedback"),"Local sample bookings cleared.");}catch{setFeedback($("#dashboard-feedback"),"Unable to clear sample data.",true)}
 });
 showBookings(true);
}
function initGuide(){
 const open=$("#guide-toggle"),panel=$("#guide-panel");if(!open||!panel)return;
 open.addEventListener("click",()=>{const show=panel.hidden;panel.hidden=!show;open.setAttribute("aria-expanded",String(show));if(show)$("#guide-close").focus()});
 $("#guide-close").addEventListener("click",()=>{panel.hidden=true;open.setAttribute("aria-expanded","false");open.focus()});
 panel.addEventListener("click",event=>{
  const q=event.target.closest("[data-guide]");if(!q)return;
  const answers={
   services:'Choose Hair, Nails, Skin, Makeup or Beauty. Browse all services at <a href="services.html">Our services</a>.',
   booking:'Select a service, choose a Tuesday–Saturday date, and pick one of the available time slots at <a href="book.html">Book a sample</a>.',
   changes:'View your sample appointments under <a href="my-bookings.html">My bookings</a>. The owner studio can reschedule them in this same browser.',
   payment:'All prices are fictional. This website does not collect payment or actual customer bookings.'
  };
  $("#guide-answer").innerHTML=answers[q.dataset.guide]||"Please choose an option.";
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){panel.hidden=true;open.setAttribute("aria-expanded","false");open.focus()}});
}
function initNav(){
 const menu=$("#nav-toggle"),nav=$("#nav-links");
 menu?.addEventListener("click",()=>{const yes=menu.getAttribute("aria-expanded")!=="true";menu.setAttribute("aria-expanded",String(yes));nav.classList.toggle("visible",yes)});
 $("#current-year")&&($("#current-year").textContent="2026");
}
initNav();renderServices();initBooking();initTracking();initDashboard();initGuide();
window.addEventListener("storage",()=>{if($("#customer-bookings"))showBookings(false);if($("#dashboard-bookings"))showBookings(true);if($("#booking-form")){const selected=$("#service");selected?.dispatchEvent(new Event("change"))}});
})();