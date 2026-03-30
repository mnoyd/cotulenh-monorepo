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

async function getInvitationRecord(inviteCode: string): Promise<{
  id: string;
  from_user: string;
  to_user: string | null;
  status: string;
} | null> {
  const { data, error } = await admin
    .from('game_invitations')
    .select('id, from_user, to_user, status')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getAcceptedFriendship(
  userAId: string,
  userBId: string
): Promise<{ status: string } | null> {
  const [left, right] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  const { data, error } = await admin
    .from('friendships')
    .select('status')
    .eq('user_a', left)
    .eq('user_b', right)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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
      const formError = page.locator('.form-error');
      if (await formError.isVisible().catch(() => false)) {
        throw error;
      }

      if (attempt === 1) {
        throw error;
      }

      await page.waitForURL(/\/auth\/login/u, { timeout: 15_000 });
    }
  }
}

test.describe('Invite Link Flow', () => {
  test('player generates invite link from play page and copies it', async ({ page }) => {
    test.slow();

    const inviter = createSeedUser('inviter');
    await seedConfirmedUser(inviter);
    await loginThroughUi(page, inviter);

    // Click the create invite link button
    const createLinkButton = page.locator('.challenge-actions button.text-link').last();
    await expect(createLinkButton).toBeVisible();
    await createLinkButton.click();

    // The invite link input should appear with a valid URL
    const inviteInput = page.locator('.invite-input');
    await expect(inviteInput).toBeVisible({ timeout: 10_000 });
    const linkValue = await inviteInput.inputValue();
    expect(linkValue).toMatch(/\/play\/online\/invite\/[a-zA-Z0-9]+/);

    // Copy button should be visible
    const copyButton = page.locator('.invite-result button.text-link');
    await expect(copyButton).toBeVisible();
  });

  test('unauthenticated visitor sees invite landing page with inviter name', async ({
    browser
  }) => {
    test.slow();

    const inviter = createSeedUser('inviter');
    await seedConfirmedUser(inviter);

    // Inviter creates a link
    const inviterContext = await browser.newContext();
    const inviterPage = await inviterContext.newPage();

    try {
      await loginThroughUi(inviterPage, inviter);

      const createLinkButton = inviterPage.locator('.challenge-actions button.text-link').last();
      await createLinkButton.click();

      const inviteInput = inviterPage.locator('.invite-input');
      await expect(inviteInput).toBeVisible({ timeout: 10_000 });
      const linkValue = await inviteInput.inputValue();
      const invitePath = new URL(linkValue).pathname;

      // New unauthenticated context visits the invite link
      const visitorContext = await browser.newContext();
      const visitorPage = await visitorContext.newPage();

      try {
        await visitorPage.goto(invitePath);

        // Should see the inviter's display name
        await expect(visitorPage.locator('.inviter-name')).toContainText(inviter.displayName);

        // Should see sign up CTA in Vietnamese
        const signUpButton = visitorPage.locator('a', { hasText: 'Đăng Ký Để Chơi' });
        await expect(signUpButton).toBeVisible();

        // Should see login link in Vietnamese
        const loginLink = visitorPage.locator('a', { hasText: 'Đăng Nhập' });
        await expect(loginLink).toBeVisible();

        // Time control should be displayed
        await expect(visitorPage.locator('.time-control')).toBeVisible();
      } finally {
        await visitorContext.close();
      }
    } finally {
      await inviterContext.close();
    }
  });

  test('sign-up CTA preserves invite redirect through the auth flow', async ({ browser }) => {
    test.slow();

    const inviter = createSeedUser('inviter');
    await seedConfirmedUser(inviter);

    const inviterContext = await browser.newContext();
    const inviterPage = await inviterContext.newPage();

    try {
      await loginThroughUi(inviterPage, inviter);

      const createLinkButton = inviterPage.locator('.challenge-actions button.text-link').last();
      await createLinkButton.click();

      const inviteInput = inviterPage.locator('.invite-input');
      await expect(inviteInput).toBeVisible({ timeout: 10_000 });
      const linkValue = await inviteInput.inputValue();
      const invitePath = new URL(linkValue).pathname;

      const visitorContext = await browser.newContext();
      const visitorPage = await visitorContext.newPage();

      try {
        await visitorPage.goto(invitePath);
        await visitorPage.locator('a', { hasText: 'Đăng Ký Để Chơi' }).click();

        await expect(visitorPage).toHaveURL((url) => {
          return (
            url.pathname === '/auth/register' && url.searchParams.get('redirectTo') === invitePath
          );
        });
        await expect(visitorPage.locator('input[name="redirectTo"]')).toHaveValue(invitePath);
        await expect(
          visitorPage.locator('.login-prompt a', { hasText: 'Đăng Nhập' })
        ).toHaveAttribute('href', `/auth/login?redirectTo=${encodeURIComponent(invitePath)}`);
      } finally {
        await visitorContext.close();
      }
    } finally {
      await inviterContext.close();
    }
  });

  test('authenticated user accepts invite link, auto-friend and game created', async ({
    browser
  }) => {
    test.slow();

    const inviter = createSeedUser('inviter');
    const acceptor = createSeedUser('acceptor');

    await Promise.all([seedConfirmedUser(inviter), seedConfirmedUser(acceptor)]);

    const inviterContext = await browser.newContext();
    const acceptorContext = await browser.newContext();
    const inviterPage = await inviterContext.newPage();
    const acceptorPage = await acceptorContext.newPage();

    try {
      // Inviter creates a link
      await loginThroughUi(inviterPage, inviter);

      const createLinkButton = inviterPage.locator('.challenge-actions button.text-link').last();
      await createLinkButton.click();

      const inviteInput = inviterPage.locator('.invite-input');
      await expect(inviteInput).toBeVisible({ timeout: 10_000 });
      const linkValue = await inviteInput.inputValue();
      const invitePath = new URL(linkValue).pathname;
      const inviteCode = invitePath.split('/').pop();
      expect(inviteCode).toBeTruthy();

      // Acceptor logs in and visits the invite link
      await loginThroughUi(acceptorPage, acceptor);
      await acceptorPage.goto(invitePath);

      // Acceptor should see the "Accept & Play" button
      const acceptButton = acceptorPage.locator('button', { hasText: 'Chấp Nhận & Chơi' });
      await expect(acceptButton).toBeVisible({ timeout: 10_000 });

      // Click accept — should redirect to game page
      await acceptButton.click();
      await expect(acceptorPage).toHaveURL(/\/play\/online\/[^/]+$/u, { timeout: 15_000 });

      const invitation = await getInvitationRecord(inviteCode!);
      expect(invitation).not.toBeNull();
      expect(invitation?.status).toBe('accepted');
      expect(invitation?.to_user).toBe(acceptor.id);

      const friendship = await getAcceptedFriendship(inviter.id!, acceptor.id!);
      expect(friendship).not.toBeNull();
      expect(friendship?.status).toBe('accepted');
    } finally {
      await Promise.all([inviterContext.close(), acceptorContext.close()]);
    }
  });

  test('expired or invalid invite code shows error state', async ({ page }) => {
    await page.goto('/play/online/invite/invalid-code-that-does-not-exist');

    // Should show the expired/invalid state
    await expect(page.locator('.invite-expired')).toBeVisible({ timeout: 10_000 });

    // Should have a Vietnamese back-to-home button
    const homeButton = page.locator('a', { hasText: 'Quay lại Trang chủ' });
    await expect(homeButton).toBeVisible();
  });

  test('own invitation shows copy-link UI instead of accept button', async ({ browser }) => {
    test.slow();

    const inviter = createSeedUser('inviter');
    await seedConfirmedUser(inviter);

    const inviterContext = await browser.newContext();
    const inviterPage = await inviterContext.newPage();

    try {
      await loginThroughUi(inviterPage, inviter);

      const createLinkButton = inviterPage.locator('.challenge-actions button.text-link').last();
      await createLinkButton.click();

      const inviteInput = inviterPage.locator('.invite-input');
      await expect(inviteInput).toBeVisible({ timeout: 10_000 });
      const linkValue = await inviteInput.inputValue();
      const invitePath = new URL(linkValue).pathname;

      // Inviter visits their own invite link
      await inviterPage.goto(invitePath);

      // Should see the "own invitation" state with copy button, not accept button
      await expect(inviterPage.locator('.invite-own')).toBeVisible({ timeout: 10_000 });

      // Copy section should be visible with the link input
      await expect(inviterPage.locator('.copy-section')).toBeVisible();
      await expect(inviterPage.locator('.link-input')).toBeVisible();

      // Accept button should NOT be present
      await expect(
        inviterPage.locator('button', { hasText: 'Chấp Nhận & Chơi' })
      ).not.toBeVisible();
    } finally {
      await inviterContext.close();
    }
  });
});
