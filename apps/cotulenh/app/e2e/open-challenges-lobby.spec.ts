import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getLocalSupabaseEnv } from '../scripts/local-supabase.mjs';

type SeedUser = {
  email: string;
  password: string;
  displayName: string;
};

const localSupabase = getLocalSupabaseEnv();
const admin = createClient(localSupabase.apiUrl, localSupabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function createSeedUser(label: string): SeedUser {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    email: `codex-${label}-${suffix}@example.com`,
    password: 'password123',
    displayName: `Codex ${label} ${suffix}`
  };
}

async function seedConfirmedUser(user: SeedUser): Promise<void> {
  const { error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      display_name: user.displayName
    }
  });

  if (error) {
    throw error;
  }
}

async function loginThroughUi(
  page: import('@playwright/test').Page,
  user: SeedUser
): Promise<void> {
  await page.goto('/auth/login?redirectTo=%2Fplay%2Fonline');
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/play\/online$/u);
  await expect(page.locator('.online-hub')).toBeVisible();
}

test('players can create and accept an open challenge from the lobby', async ({ browser }) => {
  test.slow();

  const creator = createSeedUser('creator');
  const acceptor = createSeedUser('acceptor');

  await Promise.all([seedConfirmedUser(creator), seedConfirmedUser(acceptor)]);

  const creatorContext = await browser.newContext();
  const acceptorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();
  const acceptorPage = await acceptorContext.newPage();

  try {
    await loginThroughUi(creatorPage, creator);

    const createGameButton = creatorPage.locator('.challenge-actions button').first();
    await createGameButton.click();

    const creatorChallengesList = creatorPage.locator('.online-hub .flat-list').first();
    await expect(creatorChallengesList.locator('.flat-list-item')).toHaveCount(1);

    await loginThroughUi(acceptorPage, acceptor);

    const openChallengesList = acceptorPage.locator('.online-hub .flat-list').first();
    const creatorChallenge = openChallengesList.locator('.flat-list-item', {
      hasText: creator.displayName
    });

    await expect(creatorChallenge).toBeVisible();

    const creatorRedirect = creatorPage.waitForURL(/\/play\/online\/[^/]+$/u, {
      timeout: 15_000
    });

    await creatorChallenge.locator('button').click();

    await expect(acceptorPage).toHaveURL(/\/play\/online\/[^/]+$/u);
    await creatorRedirect;

    expect(new URL(creatorPage.url()).pathname).toBe(new URL(acceptorPage.url()).pathname);
  } finally {
    await Promise.all([creatorContext.close(), acceptorContext.close()]);
  }
});
