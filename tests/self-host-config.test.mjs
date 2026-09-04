import test from 'node:test';
import assert from 'node:assert/strict';
test('server startup requires original authentication secret and rejects test-mode bypass', async () => {
  const { configureRuntime } = await import('../server/config.mjs');
  assert.throws(() => configureRuntime({}, {}), /AUTH_PEPPER/);
  const target = { STARLIGHT_TEST_MODE: 'true' };
  configureRuntime({ AUTH_PEPPER: 'original-secret-for-test-long-enough', STARLIGHT_TEST_MODE: 'true', PATH: 'hostile', AUTH_TRUSTED_ORIGINS: 'https://star-plan.com' }, target);
  assert.equal(target.STARLIGHT_TEST_MODE, 'false');
  assert.equal(target.AUTH_PEPPER, 'original-secret-for-test-long-enough');
  assert.equal(target.PATH, undefined);
  assert.equal(target.AUTH_TRUSTED_ORIGINS, 'https://star-plan.com');
});
