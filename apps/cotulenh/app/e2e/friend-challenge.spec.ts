import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getLocalSupabaseEnv } from '../scripts/local-supabase.mjs';

type SeedUser = {
  id?: string;
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

async function seedConfirmedUser(user: SeedUser): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
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

  user.id = data.user.id;
  return data.user.id;
}

async function createFriendship(userAId: string, userBId: string): Promise<void> {
  const { error } = await admin.from('friendships').insert({
    user_a: userAId < userBId ? userAId : userBId,
    user_b: userAId < userBId ? userBId : userAId,
    status: 'accepted',
    initiated_by: userAId
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

test('friends can send and accept a friend challenge', async ({ browser }) => {
  test.slow();

  const challenger = createSeedUser('challenger');
  const recipient = createSeedUser('recipient');

  const [challengerId, recipientId] = await Promise.all([
    seedConfirmedUser(challenger),
    seedConfirmedUser(recipient)
  ]);

  // Make them friends
  await createFriendship(challengerId, recipientId);

  const challengerContext = await browser.newContext();
  const recipientContext = await browser.newContext();
  const challengerPage = await challengerContext.newPage();
  const recipientPage = await recipientContext.newPage();

  try {
    // Both users login to the play page
    await loginThroughUi(challengerPage, challenger);
    await loginThroughUi(recipientPage, recipient);

    // Wait for presence to sync — the recipient should appear as online friend
    const recipientFriendRow = challengerPage.locator('.flat-list-item', {
      hasText: recipient.displayName
    });

    // Click the invite/challenge button on the friend row
    await expect(recipientFriendRow).toBeVisible({ timeout: 10_000 });
    await recipientFriendRow.locator('button.text-link').first().click();

    // The challenge dialog should open — click send
    const sendButton = challengerPage.locator('button', {
      hasText: /send|Gửi/i
    });
    await expect(sendButton).toBeVisible({ timeout: 5_000 });
    await sendButton.click();

    // The recipient should see the toast notification
    const toastOverlay = recipientPage.locator('.toast-overlay');
    await expect(toastOverlay).toBeVisible({ timeout: 10_000 });

    // Challenger waits for redirect after recipient accepts
    const challengerRedirect = challengerPage.waitForURL(/\/play\/online\/[^/]+$/u, {
      timeout: 15_000
    });

    // Recipient clicks accept on the toast
    const acceptButton = toastOverlay.locator('button', { hasText: /accept|Chấp Nhận/i });
    await acceptButton.click();

    // Recipient should navigate to game page
    await expect(recipientPage).toHaveURL(/\/play\/online\/[^/]+$/u);

    // Challenger should also navigate to game page
    await challengerRedirect;

    // Both should be on the same game URL
    expect(new URL(challengerPage.url()).pathname).toBe(new URL(recipientPage.url()).pathname);
  } finally {
    await Promise.all([challengerContext.close(), recipientContext.close()]);
  }
});
