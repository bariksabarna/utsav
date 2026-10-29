import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const envFiles = ['.env', '.env.local', '.env.production'];
const hasSecret = envFiles.some((file) => existsSync(file));

if (hasSecret) {
  console.error('Environment files are present in the repo. Remove them before final submission.');
  process.exit(1);
}

try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  if (branch !== 'main' && branch !== 'master') {
    console.error(`Current branch is ${branch}; expected main or master.`);
    process.exit(1);
  }
  console.log(`Branch check passed: ${branch}`);
} catch {
  console.log('Git not initialized yet; repo checks continue in bootstrap mode.');
}

console.log('Repo check passed.');
