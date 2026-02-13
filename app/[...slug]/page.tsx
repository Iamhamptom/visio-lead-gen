// Catch-all route so deep links like /dashboard or /billing don't 404 on refresh.
// Root (/) is handled by app/page.tsx; existing concrete routes (e.g. /admin, /about) still take precedence.
export { default } from '../page';

