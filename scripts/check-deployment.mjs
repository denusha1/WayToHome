import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
function env(file) {
  try {
    return parse(readFileSync(file));
  } catch {
    return {};
  }
}
const api = { ...env('apps/api/.env'), ...process.env };
const web = { ...env('apps/web/.env.local'), ...process.env };
const errors = [];
for (const key of [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'TICKET_SECRET',
  'ADMIN_USER_IDS',
  'PAYHERE_MERCHANT_ID',
  'PAYHERE_MERCHANT_SECRET',
  'PAYHERE_APP_ID',
  'PAYHERE_APP_SECRET',
])
  if (!api[key]) errors.push(`API: missing ${key}`);
for (const key of [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
])
  if (!web[key]) errors.push(`Web: missing ${key}`);
for (const [name, value] of [
  ['WEB_URL', api.WEB_URL],
  ['API_PUBLIC_URL', api.API_PUBLIC_URL],
  ['NEXT_PUBLIC_API_URL', web.NEXT_PUBLIC_API_URL],
  ['SUPABASE_URL', api.SUPABASE_URL],
]) {
  try {
    const u = new URL(value);
    if (
      u.protocol !== 'https:' ||
      ['localhost', '127.0.0.1'].includes(u.hostname) ||
      u.pathname !== '/' ||
      u.search ||
      u.hash
    )
      throw Error();
  } catch {
    errors.push(`${name}: configure a public HTTPS origin`);
  }
}
if (api.DEMO_MODE !== 'false')
  errors.push('Set DEMO_MODE=false for public deployment');
if (api.PAYHERE_SANDBOX !== 'true')
  errors.push('Use PAYHERE_SANDBOX=true for this sandbox release');
if (
  (api.TICKET_SECRET || '').length < 32 ||
  api.TICKET_SECRET?.includes('local-demo')
)
  errors.push('Generate a private TICKET_SECRET of at least 32 characters');
if (api.API_PUBLIC_URL !== web.NEXT_PUBLIC_API_URL)
  errors.push('API_PUBLIC_URL and NEXT_PUBLIC_API_URL must match');
if (
  api.SUPABASE_URL !== web.NEXT_PUBLIC_SUPABASE_URL ||
  api.SUPABASE_ANON_KEY !== web.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
  errors.push('Frontend and backend must use the same Supabase project');
if (errors.length) {
  console.error(
    'Deployment configuration incomplete (no secret values printed):\n' +
      errors.map((e) => ' - ' + e).join('\n'),
  );
  process.exitCode = 1;
} else
  console.log(
    'Configuration checks passed. Provider login, database connectivity, email/SMS delivery and sandbox payment/refund still require live verification.',
  );
