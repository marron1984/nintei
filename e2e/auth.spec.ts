import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/ログイン|Login/);
    await expect(page.getByRole('heading', { name: /ログイン|Login/i })).toBeVisible();
  });

  test('should show email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/メールアドレス|Email/i)).toBeVisible();
    await expect(page.getByLabel(/パスワード|Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ログイン|Login|Sign in/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/メールアドレス|Email/i).fill('invalid@example.com');
    await page.getByLabel(/パスワード|Password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /ログイン|Login|Sign in/i }).click();

    // Expect error message
    await expect(page.getByText(/エラー|Error|Invalid/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/メールアドレス|Email/i).fill('admin@example.com');
    await page.getByLabel(/パスワード|Password/i).fill('password123');
    await page.getByRole('button', { name: /ログイン|Login|Sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('should be able to change language', async ({ page }) => {
    await page.goto('/login');

    // Look for language selector
    const languageSelector = page.locator('select');
    if (await languageSelector.isVisible()) {
      await languageSelector.selectOption('en');
      await expect(page.getByText(/Login|Sign in/i)).toBeVisible();

      await languageSelector.selectOption('ja');
      await expect(page.getByText(/ログイン/)).toBeVisible();
    }
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/メールアドレス|Email/i).fill('admin@example.com');
    await page.getByLabel(/パスワード|Password/i).fill('password123');
    await page.getByRole('button', { name: /ログイン|Login|Sign in/i }).click();
    await page.waitForURL(/dashboard/);
  });

  test('should show dashboard stats', async ({ page }) => {
    await expect(page.getByText(/支援中|Workers|外国人/i)).toBeVisible();
    await expect(page.getByText(/受入企業|Companies/i)).toBeVisible();
    await expect(page.getByText(/タスク|Tasks/i)).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /外国人|Workers/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /企業|Companies/i })).toBeVisible();
  });
});
