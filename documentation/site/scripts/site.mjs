import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [command, role] = process.argv.slice(2);
if (
  !['build', 'start', 'serve'].includes(command) ||
  !['seller', 'admin', 'operator', 'auditor'].includes(role)
) {
  console.error('Uso: npm run build -- seller (o admin, operator, auditor).');
  process.exit(1);
}
const require = createRequire(import.meta.url);
const cli = require.resolve('@docusaurus/core/bin/docusaurus.mjs');
const args =
  command === 'build'
    ? ['--out-dir', `build/${role}`]
    : command === 'serve'
      ? ['--dir', `build/${role}`, '--no-open']
      : ['--no-open'];
const result = spawnSync(process.execPath, [cli, command, ...args], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  env: { ...process.env, LATK_DOCS_ROLE: role },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
