import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireIsolatedEnvironment } from '../../scripts/e2e/isolation.mjs';

const local = { CI: 'true', ACADEMY_E2E: 'isolated', NEXT_PUBLIC_DEMO_MODE: 'false', ACADEMY_E2E_BASE_URL: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_DB_URL: 'postgresql://postgres:local-only@127.0.0.1:54322/postgres' };
test('accepts only the explicit disposable CI environment', () => assert.equal(requireIsolatedEnvironment(local).baseUrl, local.ACADEMY_E2E_BASE_URL));
for (const [field, value] of [['CI', 'false'], ['ACADEMY_E2E', 'production'], ['NEXT_PUBLIC_DEMO_MODE', 'true'], ['ACADEMY_E2E_BASE_URL', 'https://logos-academy-three.vercel.app'], ['NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co'], ['SUPABASE_DB_URL', 'postgresql://postgres:secret@db.production.example/postgres'], ['NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1.evil.example:54321'], ['ACADEMY_E2E_BASE_URL', 'http://user:secret@localhost:3000']]) {
  test(`refuses unsafe ${field} before any connection`, () => assert.throws(() => requireIsolatedEnvironment({ ...local, [field]: value }), /isolated E2E/u));
}
