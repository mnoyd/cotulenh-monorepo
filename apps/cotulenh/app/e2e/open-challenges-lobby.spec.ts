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
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const submitButton = page.locator('button[type="submit"]');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.pressSequentially(user.email);

    await passwordInput.click();
    await passwordInput.fill('');
    await passwordInput.pressSequentially(user.password);

    if (!(await submitButton.isEnabled())) {
      await page.waitForTimeout(500);
      await emailInput.click();
      await emailInput.fill('');
      await emailInput.pressSequentially(user.email);
      await passwordInput.click();
      await passwordInput.fill('');
      await passwordInput.pressSequentially(user.password);
    }

    await expect(emailInput).toHaveValue(user.email);
    await expect(passwordInput).toHaveValue(user.password);
    await expect.poll(async () => submitButton.isEnabled(), { timeout: 15_000 }).toBe(true);
    await submitButton.click();

    try {
      await page.waitForURL(/\/play\/online$/u, { timeout: 15_000 });
      await expect(page.locator('.online-hub')).toBeVisible();
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }

      await page.waitForURL(/\/auth\/login/u, { timeout: 15_000 });
    }
  }
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

    const creatorChallenge = creatorPage.locator('.online-hub .flat-list .flat-list-item').first();
    await expect(creatorChallenge).toBeVisible();

    await loginThroughUi(acceptorPage, acceptor);

    const openChallengesList = acceptorPage.locator('.online-hub .flat-list').first();
    const creatorLobbyRow = openChallengesList.locator('.flat-list-item', {
      hasText: creator.displayName
    });

    await expect(creatorLobbyRow).toBeVisible();

    const creatorRedirect = creatorPage.waitForURL(/\/play\/online\/[^/]+$/u, {
      timeout: 15_000
    });

    await creatorLobbyRow.locator('button').click();

    await expect(acceptorPage).toHaveURL(/\/play\/online\/[^/]+$/u);
    await creatorRedirect;

    expect(new URL(creatorPage.url()).pathname).toBe(new URL(acceptorPage.url()).pathname);
  } finally {
    await Promise.all([creatorContext.close(), acceptorContext.close()]);
  }
});
