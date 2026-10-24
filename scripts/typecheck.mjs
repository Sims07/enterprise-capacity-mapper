import { execFileSync } from 'node:child_process';

try {
  execFileSync('npx', ['--yes', 'tsc', '--noEmit'], { stdio: 'inherit' });
} catch {
  process.exit(1);
}
