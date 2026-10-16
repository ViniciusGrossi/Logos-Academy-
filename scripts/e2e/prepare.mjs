import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireIsolatedEnvironment } from './isolation.mjs';

const environment = requireIsolatedEnvironment();
const secretKey = process.env.SUPABASE_SECRET_KEY;
const encryptionKey = process.env.PII_ENCRYPTION_KEY;
if (!secretKey || !encryptionKey || !process.env.GITHUB_ENV) throw new Error('Missing ephemeral CI configuration.');
const db = environment.database;
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
function sql(statement) {
  try {
    return execFileSync('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], {
      input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PGHOST: db.hostname, PGPORT: db.port, PGDATABASE: 'postgres', PGUSER: decodeURIComponent(db.username), PGPASSWORD: decodeURIComponent(db.password) },
    }).trim();
  } catch { throw new Error('Isolated fixture SQL failed; provider details suppressed.'); }
}
// Only this disposable PostgreSQL instance uses the local Auth provider. Keep
// the exact-origin/redirect checks, substituting deployment configuration, not
// authorization or business rules. The guard above refuses every remote host.
const invitationDefinition = sql("select pg_get_functiondef('logos_academy.create_invitation_link(uuid,uuid,text,text,timestamptz,text,uuid)'::regprocedure);");
const localDefinition = invitationDefinition
  .replaceAll('https://nqubjiosnlaatxxamiut.supabase.co/auth/v1/verify?', 'http://127.0.0.1:54321/auth/v1/verify?')
  .replaceAll('redirect_to=https://logos-academy-three.vercel.app/ativar', 'redirect_to=http://localhost:3000/ativar')
  .replaceAll('redirect_to=https%3A%2F%2Flogos-academy-three.vercel.app%2Fativar', 'redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fativar');
if (localDefinition === invitationDefinition || localDefinition.includes('nqubjiosnlaatxxamiut.supabase.co') || localDefinition.includes('logos-academy-three.vercel.app')) throw new Error('Local invitation provider configuration did not match the known SQL contract.');
sql(localDefinition);
const curriculum = JSON.parse(sql("select json_build_object('id',c.id,'tenantId',c.tenant_id) from logos_academy.curricula c join logos_academy.tenants t on t.id=c.tenant_id where t.slug='logos-academy' and t.deleted_at is null and c.version='v3' and c.status='active' and c.deleted_at is null;"));
if (!curriculum?.id || !curriculum.tenantId) throw new Error('Operational Explorer v3 missing from isolated migrations.');
const tenantB = randomUUID();
sql(`insert into logos_academy.tenants(id,tenant_id,name,slug) values('${tenantB}','${tenantB}','E2E Outro Ambiente','e2e-${tenantB}');`);
const password = `Ci-${randomBytes(24).toString('base64url')}!2`;
const actors = {};
for (const [name, tenantId] of [['admin', curriculum.tenantId], ['otherAdmin', tenantB]]) {
  const email = `${name.toLowerCase()}.${randomUUID()}@academy.test`;
  const response = await fetch(`${environment.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Isolated Auth fixture failed (${response.status}).`);
  const authUser = await response.json();
  if (!/^[0-9a-f-]{36}$/iu.test(authUser.id)) throw new Error('Invalid local Auth identifier.');
  const userId = randomUUID();
  sql(`begin; insert into logos_academy.users(id,tenant_id,auth_user_id,email_encrypted,display_name) values('${userId}','${tenantId}','${authUser.id}',extensions.pgp_sym_encrypt(${sqlLiteral(email)},${sqlLiteral(encryptionKey)}),'E2E ${name}'); insert into logos_academy.tenant_memberships(id,tenant_id,user_id,role) values('${randomUUID()}','${tenantId}','${userId}','admin'); commit;`);
  // Diagnose fixture/RLS independently; this does not replace the later UI login.
  const probe = await fetch(`${environment.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(15000),
  });
  if (!probe.ok) throw new Error('Isolated fixture could not authenticate with the real provider.');
  const session = await probe.json();
  for (const [table, filter] of [['users', `auth_user_id=eq.${authUser.id}`], ['tenants', `id=eq.${tenantId}`], ['tenant_memberships', `user_id=eq.${userId}`]]) {
    const visible = await fetch(`${environment.supabaseUrl}/rest/v1/${table}?select=id&${filter}`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}`, 'Accept-Profile': 'logos_academy' }, signal: AbortSignal.timeout(15000),
    });
    if (!visible.ok || (await visible.json()).length !== 1) throw new Error(`Isolated authenticated fixture cannot read its own ${table} record.`);
  }
  actors[name] = { email, password };
}
const directory = mkdtempSync(join(tmpdir(), 'academy-e2e-'));
const path = join(directory, 'private-fixture.json');
writeFileSync(path, JSON.stringify({ curriculum, actors, password }), { mode: 0o600 });
// Only the path, never credentials, is exported to later steps. The file lives
// outside the checkout and is never selected by upload-artifact.
const { appendFileSync } = await import('node:fs');
appendFileSync(process.env.GITHUB_ENV, `ACADEMY_E2E_FIXTURE=${path}\n`);
console.log('Isolated Auth administrators and Explorer v3 fixture prepared.');
