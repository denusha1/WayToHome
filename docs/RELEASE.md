# First public sandbox release

The application has not been deployed from this workspace. There are no configured hosting, database, Supabase or PayHere credentials here. The following is the concrete release procedure after those accounts are available. Do not accept real passenger payments during this sandbox release.

## Account configuration

| Account         | Required setup                                                                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway         | API service using repository-root Docker context, PostgreSQL service, public HTTPS API origin. `railway.toml` runs migrations before deployment and checks `/api/health/ready`.                                                                                                                      |
| Vercel          | Import this repository, root `apps/web`, Next.js framework, repository-level workspace/lockfile access enabled. Configure frontend variables before building.                                                                                                                                        |
| Supabase        | Enable email, phone/SMS and Google providers. Configure sender/SMTP and an SMS provider. Register Google's callback using the URL shown in Supabase. Set the public web site URL and allow the exact deployed origin's `/login` callback, including its `next` query variants. Facebook is optional. |
| PayHere sandbox | Domain-specific merchant ID/secret for checkout; a separate Merchant API app ID/secret for refunds. The API notification URL must be public.                                                                                                                                                         |

Use `apps/api/.env.production.example` and `apps/web/.env.production.example` as the deployment variable lists. Configure `DATABASE_URL` with the hosting provider's connection string, and `ADMIN_USER_IDS` with verified Supabase user UUIDs. Generate `TICKET_SECRET` locally with `openssl rand -hex 32` and store it privately. Set proxy hops to the verified hosting topology. Keep `PAYHERE_SANDBOX=true`.

For local configuration validation, put the server variables in ignored `apps/api/.env` and frontend variables in ignored `apps/web/.env.local`, then run `npm run deploy:check`. This prints only missing/invalid variable names, never their values. Do not commit populated environment files. Changing to these live variables replaces the local demo setup; use the existing example files to restore demo mode.

## Release sequence

1. Create the Railway API and PostgreSQL services and the Vercel project. Reserve their public URLs, then configure the matching API/web origins and provider credentials.
2. Deploy the API with its pre-deploy migration. Verify `/api/health/ready` returns HTTP 200 and `/api/health` reports `demo: false`.
3. Deploy the frontend with the API origin and matching Supabase public project configuration. Complete the allowed callback URLs in Supabase/Google and the public notify URL/domain configuration in PayHere.
4. Create traveller and admin test accounts in Supabase. Grant admin access only through `ADMIN_USER_IDS`. Add clearly labelled test schedules through the protected dashboard. Demo identities are rejected by the production API; there is no shared public admin password.
5. Run the acceptance checks below using those accounts before sharing the sandbox demonstration link.

## Acceptance evidence still required with real accounts

- Email login link arrives and creates a valid session; SMS OTP and Google login complete; sign-out removes access to bookings. A normal account cannot load admin data.
- Successful sandbox checkout confirms only after a signed provider notification. Cancelling the browser checkout does not itself confirm or cancel a reservation. Failed payments show the verified state. Duplicate/late callbacks cannot issue a second ticket or reclaim released seats.
- A traveller can cancel an unpaid future reservation, releasing its seats. A paid cancellation records a request while preserving the ticket until an admin approves the refund. The admin action shows the amount before submission.
- A full sandbox refund returns a provider refund reference; the booking becomes `REFUNDED`, its ticket becomes invalid and its seats are released. Repeating approval must not initiate another refund.
- If the refund HTTP response is lost, the reservation remains `REFUND_PENDING`, the ticket is invalid and another automatic refund is blocked. An operator must reconcile the outcome in PayHere. Automated refund reconciliation/retry is intentionally not provided; do not issue another refund without checking the provider record. Do not manually re-confirm a released ticket.

Locally verified: mocked Supabase/PayHere boundaries, demo cancellation/refund browser flow, duplicate/refund-failure handling, production builds, and migration/persistence using isolated PostgreSQL. These tests are not evidence of real OTP delivery or real provider transactions.

References: [PayHere checkout](https://support.payhere.lk/api-&-mobile-sdk/checkout-api), [PayHere refund API](https://support.payhere.lk/api-&-mobile-sdk/refund-api), [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Railway configuration](https://docs.railway.com/config-as-code/reference).
