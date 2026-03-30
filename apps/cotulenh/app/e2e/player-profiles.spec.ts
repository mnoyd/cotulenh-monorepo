import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getLocalSupabaseEnv } from '../scripts/local-supabase.mjs';

type SeedUser = {
  id?: string;
  email: string;
  password: string;
  displayName: string;
  username?: string;
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
    email: `profile-${label}-${suffix}@example.com`,
    password: 'password123',
    displayName: `Profile ${label} ${suffix}`
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
    .select('username')
    .eq('id', data.user.id)
    .single();
  if (profileError) throw profileError;
  user.username = profile.username;

  return data.user.id;
}

async function loginThroughUi(
  page: import('@playwright/test').Page,
  user: SeedUser,
  redirectTo = '/user/profile'
): Promise<void> {
  await page.goto(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    try {
      await page.waitForURL(new RegExp(redirectTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
        timeout: 15_000
      });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.waitForURL(/\/auth\/login/u, { timeout: 15_000 });
    }
  }
}

let userA: SeedUser;
let userB: SeedUser;

test.beforeAll(async () => {
  userA = createSeedUser('alice');
  userB = createSeedUser('bob');
  await seedConfirmedUser(userA);
  await seedConfirmedUser(userB);
});

test.afterAll(async () => {
  if (userA.id) await admin.auth.admin.deleteUser(userA.id).catch(() => {});
  if (userB.id) await admin.auth.admin.deleteUser(userB.id).catch(() => {});
});

test.describe('Player Profiles', () => {
  test('navigate to /@username shows profile data', async ({ page }) => {
    await page.goto(`/@${encodeURIComponent(userA.username!)}`);

    // Should display the player's display name
    await expect(page.locator('.section-header').first()).toContainText(userA.displayName);

    // Should show member since date
    await expect(page.locator('text=/Tham gia/')).toBeVisible();

    // Should show stats section
    await expect(page.getByText('Thống Kê Trận Đấu', { exact: true })).toBeVisible();
  });

  test('own profile shows settings link and stats', async ({ page }) => {
    await loginThroughUi(page, userA);

    // Navigate to own profile
    await page.goto('/user/profile');

    // Should show the profile title
    await expect(page.locator('.section-header').first()).toContainText('Hồ Sơ');

    // Should show settings link
    await expect(page.locator('a[href="/user/settings"]')).toBeVisible();

    // Should show rating (Unrated for new user)
    await expect(page.getByText('Xếp Hạng', { exact: true })).toBeVisible();
    await expect(page.getByText('Chưa xếp hạng', { exact: true })).toBeVisible();

    // Should show stats
    await expect(page.locator('text=/Số Trận/')).toBeVisible();
  });

  test("other player's profile shows Add Friend button when logged in", async ({ page }) => {
    await loginThroughUi(page, userA, `/@${encodeURIComponent(userB.username!)}`);

    // Should show the other user's name
    await expect(page.locator('.section-header').first()).toContainText(userB.displayName);

    // Should show Add Friend button (since they're not friends)
    await expect(page.locator('button:has-text("Thêm bạn")')).toBeVisible();
  });
});
