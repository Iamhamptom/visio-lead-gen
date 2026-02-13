// /auth exists as a route segment because /auth/callback is used for OAuth.
// Without a page, refreshing /auth would 404. Render the main app shell instead.
export { default } from '../page';

