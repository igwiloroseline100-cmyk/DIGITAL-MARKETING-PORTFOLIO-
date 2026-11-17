# Private owner backend — two independent portfolio demos

**Status: implemented server-side prototype, not deployed publicly.** GitHub Pages is static hosting and cannot run this Node service or securely authenticate an owner. Visitors can see read-only overviews on both demos, but neither overview exposes owner mutation controls.

## Local run

Requires Node.js 22+. From the repository root:

```bash
ADMIN_PASSWORD='choose-a-long-unique-password-here' node private-backend/server.cjs
```

On Windows PowerShell:

```powershell
$env:ADMIN_PASSWORD = 'choose-a-long-unique-password-here'
node private-backend/server.cjs
```

Open http://127.0.0.1:3000/admin and sign in with the environment-supplied password. Never commit credentials or data files. The default data file is `private-backend/data/demo.json`; store it outside a public web root in any actual deployment. Set `DATA_FILE` to an absolute private path if needed.

## Included server-side functionality

- **Cedar & Clay:** server-managed sample product catalogue, sample checkout API with server-calculated totals, owner-only order stage and shipping-date controls, add/remove product controls.
- **Atelier Noor:** server-managed sample bookings, service-duration overlap checks, owner-only confirmation/cancellation/rescheduling.
- Owner access requires a server-side password. Login creates a short-lived cryptographically random HttpOnly, SameSite=Strict session cookie; failed attempts are rate limited. No passwords or tokens are embedded in web pages. Owner routes return HTTP 401 without an active session.
- Sample public API routes: `GET /api/public/catalog`, `GET /api/public/services`, `POST /api/public/orders` and `POST /api/public/bookings`. These are **only available if a server is running**, and are not connected to the public GitHub Pages sites.
- Backend-only admin interface: `GET /admin`; authenticated `GET /api/admin/state` and secure form actions for sample orders/bookings/products.
- Single-process JSON disk persistence with atomic replacement for learning/prototype use. Not suitable for concurrent multi-instance production hosting.

## Not yet implemented

Public GitHub Pages workflows still run **their existing browser-local simulations**, not this server. No public deployment, production database, cross-device customer logins, staff roles, real product uploads, real payment gateway, verified order payment, notification sending, or production-grade appointment locking exists. In particular, owner login cannot be offered to real clients until the backend has a protected hosting environment, durable shared database, TLS, permissions and application integration.

## Architecture boundary

`atelier-noor/studio.html`, `cedar-clay-store/order-studio.html` and `cedar-clay-store/catalog-studio.html` are public, read-only feature previews; they do **not** execute privileged owner actions. The private owner UI exists only at `/admin` on this separately hosted Node server.

## Verify

```bash
node --test private-backend/tests/*.test.cjs
```
