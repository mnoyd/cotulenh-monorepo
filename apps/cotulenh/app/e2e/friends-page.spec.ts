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
    email: `friends-${label}-${suffix}@example.com`,
    password: 'password123',
    displayName: `Friends ${label} ${suffix}`
  };
}

async function seedConfirmedUser(user: SeedUser): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { display_name: user.displayName }
  });
  if (error) throw error;
  user.id = data.user.id;

  const { error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single();
  if (profileError) throw profileError;

  return data.user.id;
}

async function loginThroughUi(
  page: import('@playwright/test').Page,
  user: SeedUser,
  redirectTo = '/user/friends'
): Promise<void> {
  await page.goto(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);

    const submitButton = page.locator('button[type="submit"]');
    if (!(await submitButton.isEnabled())) {
      await page.waitForTimeout(500);
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
    }
    await expect(page.locator('#email')).toHaveValue(user.email);
    await expect(page.locator('#password')).toHaveValue(user.password);
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    try {
      await page.waitForURL(new RegExp(redirectTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
        timeout: 15_000
      });
      await page.reload({ waitUntil: 'networkidle' });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.waitForURL(/\/auth\/login/u, { timeout: 15_000 });
    }
  }
}

async function reloadFriendsPage(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/user/friends');
  await page.waitForLoadState('networkidle');
}

async function sendFriendRequestViaUi(
  page: import('@playwright/test').Page,
  recipient: SeedUser
): Promise<void> {
  const searchInput = page.locator('.search-input');
  await searchInput.fill(recipient.displayName.slice(0, 10));

  const searchResults = page.locator('.search-results');
  await expect(searchResults).toBeVisible();

  const resultRow = searchResults.locator('.flat-list-item', { hasText: recipient.displayName });
  await expect(resultRow).toBeVisible();

  const sendButton = resultRow.locator('button');
  await sendButton.click();

  await expect(resultRow.locator('button')).toContainText(/Đang Chờ|Pending/);
  await expect(page.locator('[data-section="sent-requests"]')).toContainText(recipient.displayName);
}

async function acceptFriendRequestViaUi(
  page: import('@playwright/test').Page,
  sender: SeedUser
): Promise<void> {
  await expect
    .poll(
      async () => {
        await reloadFriendsPage(page);
        return (await page.locator('[data-section="incoming-requests"]').textContent()) ?? '';
      },
      { timeout: 20_000 }
    )
    .toContain(sender.displayName);

  const incomingRow = page.locator('[data-section="incoming-requests"] .flat-list-item', {
    hasText: sender.displayName
  });
  await expect(incomingRow).toBeVisible();

  const acceptButton = incomingRow.locator('button', { hasText: /Chấp Nhận|Accept/ });
  await expect(acceptButton).toBeVisible();
  await acceptButton.click();
}

async function waitForFriendRow(
  page: import('@playwright/test').Page,
  friend: SeedUser
): Promise<void> {
  await expect
    .poll(
      async () => {
        await reloadFriendsPage(page);
        return (await page.locator('main').textContent()) ?? '';
      },
      { timeout: 20_000 }
    )
    .toContain(friend.displayName);
}

async function clearFriendships(): Promise<void> {
  for (const user of [userAForCleanup, userBForCleanup, userCForCleanup]) {
    if (!user?.id) continue;
    await admin.from('friendships').delete().or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  }
}

let userAForCleanup: SeedUser | null = null;
let userBForCleanup: SeedUser | null = null;
let userCForCleanup: SeedUser | null = null;

test.describe('Friends Page', () => {
  let userA: SeedUser;
  let userB: SeedUser;
  let userC: SeedUser;

  test.beforeAll(async () => {
    userA = createSeedUser('alice');
    userB = createSeedUser('bob');
    userC = createSeedUser('carol');
    await Promise.all([
      seedConfirmedUser(userA),
      seedConfirmedUser(userB),
      seedConfirmedUser(userC)
    ]);
    userAForCleanup = userA;
    userBForCleanup = userB;
    userCForCleanup = userC;
  });

  test.beforeEach(async () => {
    await clearFriendships();
  });

  test.afterAll(async () => {
    await clearFriendships();
    // Clean up users
    for (const user of [userA, userB, userC]) {
      if (user.id) await admin.auth.admin.deleteUser(user.id).catch(() => {});
    }
  });

  test('friends list loads with names and online status indicators', async ({ page }) => {
    const recipientContext = await page.context().browser()!.newContext();
    const recipientPage = await recipientContext.newPage();

    await loginThroughUi(page, userA);
    await loginThroughUi(recipientPage, userB);
    await sendFriendRequestViaUi(page, userB);
    await acceptFriendRequestViaUi(recipientPage, userA);
    await recipientContext.close();
    await waitForFriendRow(page, userB);

    // Should show the friends page title
    await expect(page.locator('h1')).toContainText(/Bạn Bè|Friends/);

    // Friend B should appear in the friends list (offline section since B isn't logged in)
    const friendRow = page.locator('.flat-list-item', { hasText: userB.displayName });
    await expect(friendRow).toBeVisible();

    // Should show status dot
    await expect(friendRow.locator('.status-dot')).toBeVisible();

    // Should show rating (unrated for new user)
    await expect(friendRow.locator('.friend-rating')).toContainText(/Chưa xếp hạng|Unrated/);
  });

  test('search for user and send friend request', async ({ browser }) => {
    const senderContext = await browser.newContext();
    const recipientContext = await browser.newContext();
    const senderPage = await senderContext.newPage();
    const recipientPage = await recipientContext.newPage();

    try {
      await loginThroughUi(recipientPage, userC);
      await loginThroughUi(senderPage, userA);
      await sendFriendRequestViaUi(senderPage, userC);

      // Recipient should see the request in incoming requests
      await expect
        .poll(
          async () => {
            await reloadFriendsPage(recipientPage);
            return (
              (await recipientPage.locator('[data-section="incoming-requests"]').textContent()) ??
              ''
            );
          },
          { timeout: 20_000 }
        )
        .toContain(userA.displayName);
      const incomingSection = recipientPage.locator('[data-section="incoming-requests"]');
      await expect(incomingSection).toContainText(userA.displayName);
    } finally {
      await senderContext.close();
      await recipientContext.close();
    }
  });

  test('accept incoming friend request and friend appears in list', async ({ browser }) => {
    const recipientContext = await browser.newContext();
    const senderContext = await browser.newContext();
    const recipientPage = await recipientContext.newPage();
    const senderPage = await senderContext.newPage();

    await loginThroughUi(recipientPage, userA);
    await loginThroughUi(senderPage, userB);
    await sendFriendRequestViaUi(senderPage, userA);
    await acceptFriendRequestViaUi(recipientPage, userB);

    // Friend B should now appear in the friends list (offline section)
    await senderContext.close();
    await waitForFriendRow(recipientPage, userB);
    const friendRow = recipientPage.locator('.flat-list-item', { hasText: userB.displayName });
    await expect(friendRow).toBeVisible();

    await recipientContext.close();
  });

  test('remove friend shows confirmation dialog and removes friend', async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const friendContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const friendPage = await friendContext.newPage();

    await loginThroughUi(ownerPage, userA);
    await loginThroughUi(friendPage, userB);
    await sendFriendRequestViaUi(ownerPage, userB);
    await acceptFriendRequestViaUi(friendPage, userA);
    await friendContext.close();

    const page = ownerPage;
    await waitForFriendRow(page, userB);

    // Find friend B in the list
    const friendRow = page.locator('.flat-list-item', { hasText: userB.displayName });
    await expect(friendRow).toBeVisible();

    // Click remove button
    const removeButton = friendRow.locator('button.danger');
    await removeButton.click();

    // Confirmation dialog should appear
    const dialog = page.locator('[class*="alert-content"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(userB.displayName);

    // Confirm removal
    const confirmButton = dialog.locator('[class*="alert-action-btn"]');
    await confirmButton.click();

    // Friend B should no longer be in the list
    await expect(friendRow).not.toBeVisible();
    await ownerContext.close();
  });

  test('presence updates when second user comes online', async ({ browser }) => {
    test.slow();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginThroughUi(pageA, userA);
      await loginThroughUi(pageB, userB);
      await sendFriendRequestViaUi(pageA, userB);
      await acceptFriendRequestViaUi(pageB, userA);
      await contextB.close();
      await waitForFriendRow(pageA, userB);

      // User B should initially be in offline section
      const offlineFriend = pageA.locator('.flat-list-item', { hasText: userB.displayName });
      await expect(offlineFriend).toBeVisible();

      // Now user B logs in again and should appear online
      const contextB2 = await browser.newContext();
      const pageB2 = await contextB2.newPage();
      await loginThroughUi(pageB2, userB, '/user/friends');

      // Wait for presence to propagate — user B should move to online section
      const onlineDot = pageA
        .locator('.flat-list-item', { hasText: userB.displayName })
        .locator('.status-dot.online');
      await expect(onlineDot).toBeVisible({ timeout: 15_000 });
      await contextB2.close();
    } finally {
      await contextA.close();
      await contextB.close().catch(() => {});
    }
  });
});
