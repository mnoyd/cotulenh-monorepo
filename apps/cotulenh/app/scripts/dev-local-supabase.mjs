import { spawn } from 'node:child_process';
import { buildLocalSupabasePublicEnv } from './local-supabase.mjs';

const env = buildLocalSupabasePublicEnv({ cwd: process.cwd() });

const child = spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit'
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
