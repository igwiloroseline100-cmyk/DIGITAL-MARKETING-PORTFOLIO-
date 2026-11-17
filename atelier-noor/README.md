# Atelier Noor — Service Business & Booking Website

**Portfolio demonstration, not a real salon.** Atelier Noor is a fictional premium beauty studio built as a second independent website project. All services, prices, appointments and statuses are illustrative. No real booking, payment, email, SMS, live calendar, secure customer database or staff availability is connected.

## Working experiences

- index.html — responsive branded homepage, service previews, booking journey and scripted quick-answer guide (explicitly not an AI chatbot).
- services.html — six fictional services with prices in NGN, appointment durations, category filters, and service-specific links into the booking form.
- book.html — functioning sample booking form. Users select a service, eligible date, valid start time and a **fictional** guest name. A booking reference and confirmation are created locally.
- my-bookings.html — customer-side sample appointment history, status, example notification text and cancellation control.
- studio.html — browser-local owner dashboard demonstration with appointment counts, status filters, confirmations, rescheduling, completion and cancellations.
- assets/booking-core.js — independently testable business rules: Tuesday to Saturday, 10:00–18:00 Africa/Lagos; bookings within 60 days; 30-minute start-time increments; service-dependent durations; conflict detection in the demo's **single shared local calendar**; status changes and sample rescheduling.
- assets/app.js — page interactions, form validation, local storage, management controls and message previews.
- assets/styles.css — responsive layouts, keyboard focus and reduced-motion support.
- tests/booking.mjs — automated checks of date rules, duration overlaps, scheduling, rescheduling, cancellation, and page structure.
- .github/workflows/atelier-noor-tests.yml — continuous checks (from repository root).

## Test the full scenario

1. Open services.html and select **Signature Braids**.
2. Pick a Tuesday–Saturday date in the next 60 days, choose a free time, and enter a fictional sample guest name.
3. Submit and view the sample confirmation and reference.
4. Open my-bookings.html to inspect the record.
5. Open studio.html **in the same browser** and change the status to Confirmed. Choose another eligible date/time to test rescheduling.
6. Return to my-bookings.html and verify that status and schedule updates are visible. Cancel a sample request to free its time slot.
7. Try adding a different service that overlaps an existing active appointment; its conflicting time choices should disappear.

## Important limitations

All appointments live in this browser's localStorage. There is **no real backend**. State isn't shared between devices or visitors, and concurrent writers in separate tabs are not transactionally locked. Therefore the demo cannot guarantee real-world prevention of double-booking. No owner authentication, staff scheduling, real inventory, actual client identity, message delivery, or payment processing is implemented. The Studio Guide is an interactive scripted FAQ, not artificial intelligence.

The visuals use CSS treatments and two externally hosted example photographs, with gradient fallbacks when images cannot load. The site remains usable without remote imagery.

Production requirements include an authenticated admin backend, shared transactional appointment database with server-side overlap protection, customer permission checks, verified staff schedules, configurable timezone rules, email/SMS service with consent, optional deposit payment through a processor, audit logging and end-to-end browser QA.

This project intentionally remains separate from Cedar & Clay e-commerce and the five future AI automation systems.
