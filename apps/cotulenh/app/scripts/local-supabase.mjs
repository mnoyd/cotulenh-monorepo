import { execFileSync } from 'node:child_process';

let cachedEnv = null;

function parseEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function getLocalSupabaseEnv({ cwd = process.cwd() } = {}) {
  if (cachedEnv) {
    return cachedEnv;
  }

  let output;

  try {
    output = execFileSync('pnpm', ['dlx', 'supabase', 'status', '-o', 'env'], {
      cwd,
      encoding: 'utf8'
    });
  } catch (error) {
    throw new Error(
      'Failed to read local Supabase credentials. Start the stack with `pnpm dlx supabase start` and retry.',
      { cause: error }
    );
  }

  const values = {};

  for (const line of output.split(/\r?\n/u)) {
    const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line.trim());
    if (!match) continue;
    values[match[1]] = parseEnvValue(match[2]);
  }

  const requiredKeys = ['API_URL', 'PUBLISHABLE_KEY', 'SERVICE_ROLE_KEY'];
  const missingKeys = requiredKeys.filter((key) => !values[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Local Supabase status is missing ${missingKeys.join(', ')}.`);
  }

  cachedEnv = {
    apiUrl: values.API_URL,
    publishableKey: values.PUBLISHABLE_KEY,
    anonKey: values.ANON_KEY ?? '',
    serviceRoleKey: values.SERVICE_ROLE_KEY,
    values
  };

  return cachedEnv;
}

export function buildLocalSupabasePublicEnv(options) {
  const env = getLocalSupabaseEnv(options);

  return {
    ...process.env,
    PUBLIC_SUPABASE_URL: env.apiUrl,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.publishableKey
  };
}
