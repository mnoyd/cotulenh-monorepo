import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getLocalSupabaseEnv } from '../scripts/local-supabase.mjs';

type SeedUser = {
  id?: string;
  username?: string;
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

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, username')
    .eq('id', data.user.id)
    .single();
  if (profileError) throw profileError;
  user.username = profile.username;

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
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.pressSequentially(user.email);

    await passwordInput.click();
    await passwordInput.fill('');
    await passwordInput.pressSequentially(user.password);

    const submitButton = page.locator('button[type="submit"]');
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
      await page.waitForURL((url) => url.pathname === redirectTo, {
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
  recipient: SeedUser,
  query: string = recipient.displayName.slice(0, 10)
): Promise<void> {
  const searchInput = page.locator('.search-input');
  await searchInput.fill(query);

  const searchResults = page.locator('.search-results');
  await expect(searchResults).toBeVisible();

  const resultRow = searchResults.locator('.flat-list-item', { hasText: recipient.displayName });
  await expect(resultRow).toBeVisible();

  const sendButton = resultRow.locator('button');
  await sendButton.click();

  await expect(resultRow.locator('button')).toContainText(/Đang Chờ|Pending/);
  await expect(page.locator('[data-section="sent-requests"]')).toContainText(recipient.displayName);
}

async function sendFriendRequestFromProfileViaUi(
  page: import('@playwright/test').Page,
  recipient: SeedUser
): Promise<void> {
  if (!recipient.username) throw new Error('Recipient username is required');

  await page.goto(`/@${recipient.username}`);
  await page.waitForLoadState('networkidle');

  const addFriendButton = page.locator('button', { hasText: /Thêm bạn|Add Friend/ });
  await expect(addFriendButton).toBeVisible();
  await addFriendButton.click();

  await expect(page.locator('main')).toContainText(/Đã gửi lời mời|Request Sent/);
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

async function clearUserState(userId: string): Promise<void> {
  const { data: games, error: gamesError } = await admin
    .from('games')
    .select('id')
    .or(`red_player.eq.${userId},blue_player.eq.${userId}`);
  if (gamesError) throw gamesError;

  if (games && games.length > 0) {
    const { error: deleteGamesError } = await admin
      .from('games')
      .delete()
      .in(
        'id',
        games.map((game) => game.id)
      );
    if (deleteGamesError) throw deleteGamesError;
  }

  const { error: invitationError } = await admin
    .from('game_invitations')
    .delete()
    .or(`from_user.eq.${userId},to_user.eq.${userId}`);
  if (invitationError) throw invitationError;

  const { error: friendshipError } = await admin
    .from('friendships')
    .delete()
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (friendshipError) throw friendshipError;
}

async function clearFriendships(): Promise<void> {
  for (const user of [userAForCleanup, userBForCleanup, userCForCleanup]) {
    if (!user?.id) continue;
    await clearUserState(user.id);
  }
}

async function createFriendship(userAId: string, userBId: string): Promise<void> {
  const { error } = await admin.from('friendships').insert({
    user_a: userAId < userBId ? userAId : userBId,
    user_b: userAId < userBId ? userBId : userAId,
    status: 'accepted',
    initiated_by: userAId
  });
  if (error) throw error;
}

async function findLatestInvitation(fromUserId: string, toUserId: string) {
  const { data, error } = await admin
    .from('game_invitations')
    .select('id, to_user, status, game_config, created_at')
    .eq('from_user', fromUserId)
    .eq('to_user', toUserId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function openChallengeDialogForFriend(
  page: import('@playwright/test').Page,
  friend: SeedUser
): Promise<import('@playwright/test').Locator> {
  const friendRow = page.locator('[data-section="online-friends"] .flat-list-item', {
    hasText: friend.displayName
  });
  await expect(friendRow).toBeVisible();
  await friendRow.getByRole('button', { name: 'Thách đấu' }).click();

  const dialog = page.locator('.challenge-dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
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

  test('search by username and send friend request', async ({ browser }) => {
    const senderContext = await browser.newContext();
    const recipientContext = await browser.newContext();
    const senderPage = await senderContext.newPage();
    const recipientPage = await recipientContext.newPage();

    try {
      await loginThroughUi(recipientPage, userC);
      await loginThroughUi(senderPage, userA);
      await sendFriendRequestViaUi(senderPage, userC, userC.username!);

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

  test('send friend request from /@username profile page', async ({ browser }) => {
    const senderContext = await browser.newContext();
    const recipientContext = await browser.newContext();
    const senderPage = await senderContext.newPage();
    const recipientPage = await recipientContext.newPage();

    try {
      await loginThroughUi(recipientPage, userB);
      await loginThroughUi(senderPage, userA);
      await sendFriendRequestFromProfileViaUi(senderPage, userB);

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
    } finally {
      await senderContext.close();
      await recipientContext.close();
    }
  });

  test('online friend shows enabled challenge button, offline shows disabled', async ({
    browser
  }) => {
    test.slow();

    // Create friendship directly via admin
    await createFriendship(userA.id!, userB.id!);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Both login — B goes to friends page to join presence
      await loginThroughUi(pageA, userA);
      await loginThroughUi(pageB, userB);

      // Poll-reload until B appears in online section on A's page
      await expect
        .poll(
          async () => {
            await reloadFriendsPage(pageA);
            const onlineSection = pageA.locator('[data-section="online-friends"]');
            return (await onlineSection.textContent()) ?? '';
          },
          { timeout: 20_000 }
        )
        .toContain(userB.displayName);

      // Online friend should have enabled challenge button
      const onlineFriendRow = pageA.locator('[data-section="online-friends"] .flat-list-item', {
        hasText: userB.displayName
      });
      await expect(onlineFriendRow).toBeVisible();
      const challengeButton = onlineFriendRow.getByRole('button', { name: 'Thách đấu' });
      await expect(challengeButton).toBeEnabled();

      // Close user B to make them go offline
      await contextB.close();

      // Wait for B to appear in offline section
      await expect
        .poll(
          async () => {
            await reloadFriendsPage(pageA);
            const offlineSection = pageA.locator('[data-section="offline-friends"]');
            return (await offlineSection.textContent()) ?? '';
          },
          { timeout: 20_000 }
        )
        .toContain(userB.displayName);

      // Offline friend should have disabled challenge button
      const offlineFriendRow = pageA.locator('[data-section="offline-friends"] .flat-list-item', {
        hasText: userB.displayName
      });
      await expect(offlineFriendRow).toBeVisible();
      const disabledButton = offlineFriendRow.getByRole('button', { name: 'Thách đấu' });
      await expect(disabledButton).toBeDisabled();
    } finally {
      await contextA.close();
      await contextB.close().catch(() => {});
    }
  });

  test('challenge button opens dialog with time controls, rated/casual, and color options', async ({
    browser
  }) => {
    test.slow();

    await createFriendship(userA.id!, userB.id!);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginThroughUi(pageA, userA);
      await loginThroughUi(pageB, userB);

      // Poll-reload until B appears online
      await expect
        .poll(
          async () => {
            await reloadFriendsPage(pageA);
            const onlineSection = pageA.locator('[data-section="online-friends"]');
            return (await onlineSection.textContent()) ?? '';
          },
          { timeout: 20_000 }
        )
        .toContain(userB.displayName);

      const dialog = await openChallengeDialogForFriend(pageA, userB);
      await expect(dialog).toContainText(userB.displayName);

      // Time control presets should be visible and default to 15+10
      await expect(dialog).toContainText('1+0');
      await expect(dialog).toContainText('15+10');
      await expect(dialog).toContainText('30+0');
      await expect(dialog.locator('button.active').filter({ hasText: '15+10' })).toBeVisible();

      // Rated/Casual toggle defaults to casual
      await expect(dialog.getByRole('button', { name: 'Giao Hữu' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Xếp Hạng' })).toBeVisible();
      await expect(dialog.locator('button.active').filter({ hasText: 'Giao Hữu' })).toBeVisible();

      // Color choice defaults to random
      await expect(dialog.getByRole('button', { name: 'Ngẫu nhiên' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Đỏ' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Xanh' })).toBeVisible();
      await expect(dialog.locator('button.active').filter({ hasText: 'Ngẫu nhiên' })).toBeVisible();
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('submit challenge from friends page: invitation sent and friend receives toast', async ({
    browser
  }) => {
    test.slow();

    await createFriendship(userA.id!, userB.id!);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Login B first so realtime subscription is established before challenge arrives
      await loginThroughUi(pageB, userB);
      await loginThroughUi(pageA, userA);

      // Poll-reload until B appears online
      await expect
        .poll(
          async () => {
            await reloadFriendsPage(pageA);
            const onlineSection = pageA.locator('[data-section="online-friends"]');
            return (await onlineSection.textContent()) ?? '';
          },
          { timeout: 20_000 }
        )
        .toContain(userB.displayName);

      const dialog = await openChallengeDialogForFriend(pageA, userB);

      // Click send button
      const sendButton = dialog.getByRole('button', { name: 'Gửi thách đấu' });
      await sendButton.click();

      await expect
        .poll(async () => findLatestInvitation(userA.id!, userB.id!), {
          timeout: 15_000
        })
        .not.toBeNull();

      const createdInvitation = await findLatestInvitation(userA.id!, userB.id!);
      expect(createdInvitation?.to_user).toBe(userB.id);
      expect(createdInvitation?.status).toBe('pending');
      expect(createdInvitation?.game_config).toMatchObject({
        timeMinutes: 15,
        incrementSeconds: 10,
        isRated: false,
        preferredColor: 'random'
      });

      // Friend B should receive the toast notification
      const toastOverlay = pageB.getByRole('alertdialog');
      await expect(toastOverlay).toBeVisible({ timeout: 15_000 });
      await expect(toastOverlay).toContainText(userA.displayName);
      await expect(toastOverlay).toContainText('15+10');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('friend accepts challenge from friends page, both navigate to game', async ({ browser }) => {
    test.slow();

    await createFriendship(userA.id!, userB.id!);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Login B first so realtime subscription is established
      await loginThroughUi(pageB, userB);
      await loginThroughUi(pageA, userA);

      // Poll-reload until B appears online
      await expect
        .poll(
          async () => {
            await reloadFriendsPage(pageA);
            const onlineSection = pageA.locator('[data-section="online-friends"]');
            return (await onlineSection.textContent()) ?? '';
          },
          { timeout: 20_000 }
        )
        .toContain(userB.displayName);

      const dialog = await openChallengeDialogForFriend(pageA, userB);
      const sendButton = dialog.getByRole('button', { name: 'Gửi thách đấu' });
      await sendButton.click();

      // Friend B receives toast
      const toastOverlay = pageB.getByRole('alertdialog');
      await expect(toastOverlay).toBeVisible({ timeout: 15_000 });

      // Recipient accepts
      const acceptButton = toastOverlay.getByRole('button', { name: 'Chấp nhận' });
      await acceptButton.click();

      // Recipient navigates to game page
      await expect(pageB).toHaveURL(/\/play\/online\/[^/]+/u, { timeout: 15_000 });

      // Challenger auto-navigates from the friends page when the invitation is accepted
      await expect(pageA).toHaveURL(/\/play\/online\/[^/]+/u, { timeout: 15_000 });

      // Both on the same game URL
      expect(new URL(pageA.url()).pathname).toBe(new URL(pageB.url()).pathname);
    } finally {
      await contextA.close();
      await contextB.close();
    }
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
