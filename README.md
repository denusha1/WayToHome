# Way to Home

A Sri Lankan bus booking application with a Next.js + TypeScript frontend, Tailwind CSS, shadcn-style Radix UI components, a NestJS API, PostgreSQL/Prisma, Supabase Auth, Socket.IO seat availability, PayHere checkout, QR tickets, and an admin dashboard.

## Portfolio and launch guide

- [Who does what and step-by-step setup](docs/START-HERE.md)
- [Architecture, demo narration and interview preparation](docs/PORTFOLIO.md)
- [Local booking walkthrough video](docs/demo/booking-walkthrough.webm) — simulated payment, not live provider verification
- [Public sandbox release checklist](docs/RELEASE.md)

## Run locally

Use Node.js 22 or newer. From the repository root:

```bash
npm ci
npm run db:generate
npm run dev
```

Open **http://localhost:3000**. The API runs on **http://localhost:4000**. No account keys or database are needed for the local demo.

Demo mode includes sample schedules for the next 30 days, simulated payments, QR tickets, and an open demo admin dashboard. Its in-memory data resets on API restart. These are **not real operator schedules or valid travel tickets**. Demo identity is browser-specific. Never use demo mode on a public deployment; the API refuses it when `NODE_ENV=production`.

## Included flows

- Responsive home page with the supplied copy, user-provided bus photograph, and a navy / sand-gold colour theme. The original photo is served locally from `apps/web/public/images/journey-bus.avif`.
- Route/date search, reverse-city control, departure times in Sri Lanka time, and availability.
- Up to six seats per booking; a five-minute hold, then a fifteen-minute payment window.
- Database transaction locks and a unique trip/seat constraint prevent double booking. A competing hold gets HTTP 409. Expired holds no longer block inventory.
- Socket.IO invalidation and ten-second polling refresh the seat picker, including expiry and multi-instance fallback.
- Supabase passwordless email sign-in, phone/SMS OTP verification, Google and Facebook sign-in, and a dedicated Create Account page; server verification of the access token. Supabase owns the user directory; bookings store its user ID.
- PayHere hosted checkout with server-created hashes and verified server notifications. The return URL never confirms a payment. Late successful payments go to `PAYMENT_REVIEW` instead of reclaiming a released seat.
- My bookings, payment resumption, printable QR e-tickets, authenticated ticket access, and single-use admin check-in within 24 hours of departure.
- Admin bus/route creation, departure scheduling with overlapping bus journeys rejected, booking overview, notification retry, and GPS coordinate publishing.
- Passenger tracking pages with the latest reported vehicle position, stale-location indication, and Google Maps links/embeds. A real GPS device must supply updates; no vehicle locations are fabricated.
- Resend confirmation email containing an authenticated ticket link, plus an SMS adapter.

## PostgreSQL and live integrations

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d db
npm run db:migrate
# Optional: sample schedules only; do not seed these into a live operator database.
npm run db:seed
```

Set `DEMO_MODE=false` in `apps/api/.env` and configure:

| Service           | Configuration                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL        | `DATABASE_URL`; migrations are committed under `apps/api/prisma/migrations`                                                                                                                                                  |
| Supabase Auth     | API: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Allow `/login` on your web domain in Supabase redirect URLs. Enable email auth and configure its email delivery. |
| Admin access      | `ADMIN_USER_IDS`: comma-separated Supabase user UUIDs. Roles are never accepted from the browser.                                                                                                                            |
| Ticket signatures | `TICKET_SECRET`: generate with `openssl rand -hex 32`; keep it server-side and stable.                                                                                                                                       |
| PayHere           | `PAYHERE_MERCHANT_ID`, domain-specific `PAYHERE_MERCHANT_SECRET`, `PAYHERE_SANDBOX=true` for testing. `API_PUBLIC_URL` must be publicly accessible for `/api/payments/notify`.                                               |
| Resend            | `RESEND_API_KEY`, `EMAIL_FROM` on a verified sending domain. Messages link to the QR ticket in My bookings.                                                                                                                  |
| SMS               | `SMS_API_URL`, `SMS_API_TOKEN`. The adapter posts JSON `{to, message}` with bearer authentication. Match `src/notifications.ts` to your chosen local provider’s actual contract before enabling it.                          |
| Google Maps       | `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, with Maps Embed API enabled and HTTP-referrer restrictions for your website. Plain Google Maps links work without a key.                                                                      |
| URLs              | `WEB_URL`, `API_PUBLIC_URL`, and frontend `NEXT_PUBLIC_API_URL` must match the deployed origins.                                                                                                                             |

Restart the API and frontend after changing environment variables. `NEXT_PUBLIC_*` values are embedded at frontend build time. Never place merchant secrets, Resend keys, SMS tokens, or the ticket secret in frontend variables.

GPS integrations can submit `POST /api/admin/trips/:id/location` with a verified admin bearer token and `{latitude, longitude}`. Only transmit vehicle coordinates. Tracking is read at `GET /api/trips/:id/location`. The admin dashboard also provides manual entry. A dedicated restricted device identity is advisable before connecting a fleet of GPS devices.

## Deployment

**Frontend / Vercel:** import the repository, select `apps/web` as the project root, choose Next.js, and enable access to files outside the root directory for the npm workspace. Set the frontend environment variables, then build. Use the repository lockfile.

**API / Railway or AWS containers:** the repository includes `apps/api/Dockerfile` and `railway.toml`. Build with the repository root as context. Attach a PostgreSQL database and set the server variables. Set `NODE_ENV=production`, `DEMO_MODE=false`, and HTTPS public URLs. Run `npm run db:migrate` as a pre-deploy/release command before starting the API. The container honors `PORT`; `/api/health` is the health endpoint. Set `TRUST_PROXY_HOPS` to the verified number of reverse proxies in front of the API so rate limits use the real client address. Leave it at 0 when connecting directly.

Use one API replica initially. PostgreSQL seat locking works across instances; Socket.IO broadcasts are local to each process, with polling as fallback. Add a shared Socket.IO adapter before relying exclusively on cross-instance push updates. Inventory transactions currently load a trip’s booking history; paginate admin endpoints and optimize inventory queries for a larger fleet.

External accounts, merchant approval, domains, credentials, production operator schedules, and deployment are not bundled. PayHere, Supabase email sign-in, Resend, SMS delivery, and map embeds need end-to-end tests with your accounts before accepting real passengers. Paid late/chargeback bookings require operator review. Full refund requests and admin-approved PayHere refunds are implemented; ambiguous refund outcomes stay pending for manual reconciliation. Live provider verification remains required. Notification failures are logged and can be retried by an admin; a durable background delivery worker is not included.

## Checks

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For a disposable PostgreSQL test database, run migrations first, then:

```bash
TEST_DATABASE_URL=postgresql://waytohome:localdev@localhost:5432/waytohome_test npm run test:db
```

The database test uses isolated UUID records and removes only its own records. Unit tests cover seat contention, expiration, server-side fares, ownership, idempotent payment operations, callback tampering, late payments, QR validation, and schedule conflicts. Browser tests cover the complete demo booking flow, mobile navigation, layout overflow, and API validation. CI also applies the real PostgreSQL migration and runs the database integration test.

## Project layout

```text
apps/web/src/app        Home, login, bookings, admin, tracking pages
apps/web/src/components Reusable UI and seat picker
apps/api/src            NestJS API, booking service, auth, realtime, integrations
apps/api/prisma         PostgreSQL schema, migration, optional sample data
tests                  Playwright browser tests
```

Integration references: [PayHere checkout](https://support.payhere.lk/api-&-mobile-sdk/checkout-api), [Supabase server user verification](https://supabase.com/docs/reference/javascript/auth-getuser), [NestJS gateways](https://docs.nestjs.com/websockets/gateways), [Prisma migrations](https://docs.prisma.io/docs/orm/v6/reference/prisma-cli-reference), [Resend email](https://resend.com/docs/send-with-nodejs), [Maps Embed API](https://developers.google.com/maps/documentation/embed/embedding-map), and [shadcn manual setup](https://ui.shadcn.com/docs/installation/manual).

## Sign-in providers

The sign-in and Create Account pages use the supplied photograph in `apps/web/public/images/signin-journey.jpg`. Both use the same authentication panel. Login uses `shouldCreateUser: false`; Create Account explicitly permits user creation; authentication completes only after contact verification.

Enable Google and Facebook in your Supabase Auth provider settings and enter each provider’s app credentials there. Register the Supabase callback URL with Google/Facebook, and allow your website’s `/login` URL in Supabase redirect settings. Phone login requires phone authentication and a supported SMS provider configured **in Supabase**; the booking-confirmation SMS adapter in NestJS is separate. Existing email magic-link configuration still applies.

When no Supabase keys are configured, the interface displays a service-unavailable message rather than simulating a verified login. Demo bus bookings remain available without sign-in. Live OAuth, emails and SMS still require verification with your accounts.

`npm run test:web` checks input normalization, email/account creation options, OTP verification and OAuth destinations with mocked auth clients; it does not send messages or contact providers. See [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), and [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook) for account setup.

### Journeys, contact and booking pages

`/journeys` supports shareable From/To/date searches, a rolling 30-day date strip, departure/operator/boarding-or-arrival-stop filters, pagination, timetables and the existing seat/checkout flow. Homepage search and destination cards open this page. Fares, availability and operators come from the booking API; demo mode labels the sample schedules.

`/bookings` includes upcoming/past/payment filters, booking-reference search, boarding and arrival details, passenger/payment information and QR tickets. The contact page uses sample contact details by default and downloads an explicitly unsent message draft. Set `NEXT_PUBLIC_SUPPORT_EMAIL` to a real support mailbox to open the visitor's email app with their prepared message; the visitor sends it there. There is no background contact-form delivery or support inbox in this implementation.


## Sandbox release preparation

See [docs/RELEASE.md](docs/RELEASE.md) for the production variable templates, provider setup, deployment order and live acceptance checks. `npm run deploy:check` reports missing configuration without revealing secret values. No public deployment or live provider transactions have been completed from this workspace.

Bookings/admin pages now verify access with `/api/me` before mounting private content. The API independently verifies Supabase tokens and the server-owned admin allowlist. Safe local return destinations preserve the sign-in journey. Unpaid cancellation and paid cancellation requests are available from My bookings. Admins can approve a full PayHere refund using separate Merchant API credentials; a transaction claim prevents concurrent/automatic duplicate requests, and provider uncertainty requires manual reconciliation. Demo refunds never move money. Apply the new refund migration before running the updated API against PostgreSQL.

Journey discovery also includes lowest-fare/shortest-duration/seat-count sorting, an available-seats filter and side-by-side comparison of up to three buses. Comparison uses the current search results; availability is checked again by the existing seat picker. Up to five saved routes and five recent route searches are stored only in the current browser, with remove/clear controls. No passenger or payment information is saved by route shortcuts.
