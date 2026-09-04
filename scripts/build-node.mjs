import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], {
  stdio: 'inherit', env: { ...process.env, STARLIGHT_RUNTIME: 'node' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
