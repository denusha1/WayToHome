import 'dotenv/config';
export const config = {
  demo:
    process.env.DEMO_MODE === 'true' ||
    (process.env.DEMO_MODE === undefined &&
      process.env.NODE_ENV !== 'production'),
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  apiUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
  ticketSecret:
    process.env.TICKET_SECRET || 'local-demo-ticket-secret-do-not-deploy',
};
export function validateConfig() {
  if (config.demo && process.env.NODE_ENV === 'production')
    throw new Error('DEMO_MODE is forbidden in production.');
  if (!config.demo) {
    for (const key of [
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'TICKET_SECRET',
      'PAYHERE_MERCHANT_ID',
      'PAYHERE_MERCHANT_SECRET',
    ]) {
      if (!process.env[key])
        throw new Error(`Missing required environment variable: ${key}`);
    }
    if (config.ticketSecret.length < 32)
      throw new Error('TICKET_SECRET must be at least 32 characters.');
    if (
      process.env.NODE_ENV === 'production' &&
      (!config.webUrl.startsWith('https://') ||
        !config.apiUrl.startsWith('https://'))
    )
      throw new Error('Production requires HTTPS public URLs.');
  }
}
