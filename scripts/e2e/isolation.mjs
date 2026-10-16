/** Fail closed before creating a client, opening a browser or changing data. */
export function requireIsolatedEnvironment(env = process.env) {
  const deny = () => { throw new Error('Refusing non-isolated E2E environment. CI, explicit opt-in and loopback services are required.'); };
  if (env.CI !== 'true' || env.ACADEMY_E2E !== 'isolated' || env.NEXT_PUBLIC_DEMO_MODE !== 'false') deny();
  function localUrl(value, protocols, port) {
    let url;
    try { url = new URL(value); } catch { deny(); }
    if (!protocols.includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== port) deny();
    return url;
  }
  const app = localUrl(env.ACADEMY_E2E_BASE_URL, ['http:'], '3000');
  const supabase = localUrl(env.NEXT_PUBLIC_SUPABASE_URL, ['http:'], '54321');
  const database = localUrl(env.SUPABASE_DB_URL, ['postgres:', 'postgresql:'], '54322');
  if (app.username || app.password || supabase.username || supabase.password || app.pathname !== '/' || supabase.pathname !== '/' || app.search || app.hash || supabase.search || supabase.hash || database.pathname !== '/postgres' || database.search || database.hash) deny();
  return Object.freeze({ baseUrl: app.origin, supabaseUrl: supabase.origin, database });
}
