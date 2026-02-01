/**
 * SupportPlan E2E Smoke Test
 * 支援計画ページの基本的な動作確認
 */

import { test, expect } from '@playwright/test';

test.describe('Support Plan Page', () => {
  test('should display the support plan page with 10 items', async ({ page }) => {
    // Navigate to a worker's support plan page
    await page.goto('/workers/worker-1/support-plan');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: '支援計画' })).toBeVisible();

    // Check that progress bar exists
    await expect(page.locator('.bg-primary-500')).toBeVisible();

    // Check that 10 support items are displayed (支援10項目)
    const items = [
      '事前ガイダンス',
      '出入国時の送迎',
      '住居確保・生活契約支援',
      '生活オリエンテーション',
      '公的手続等への同行',
      '日本語学習の機会の提供',
      '相談・苦情への対応',
      '日本人との交流促進',
      '転職支援',
      '定期的な面談',
    ];

    for (const item of items) {
      await expect(page.getByText(item).first()).toBeVisible();
    }
  });

  test('should show task completion button for incomplete tasks', async ({ page }) => {
    await page.goto('/workers/worker-1/support-plan');

    // Find a todo task and check for completion button
    const todoTask = page.locator('.badge:has-text("未着手")').first();
    if (await todoTask.isVisible()) {
      // There should be a 完了 button nearby
      const parentContainer = todoTask.locator('..').locator('..');
      await expect(parentContainer.getByRole('button', { name: '完了' })).toBeVisible();
    }
  });

  test('should open evidence modal when clicking add button', async ({ page }) => {
    await page.goto('/workers/worker-1/support-plan');

    // Find an add evidence button (Plus icon)
    const addButton = page.locator('button[title="エビデンスを追加"]').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Check that modal is opened
      await expect(page.getByRole('heading', { name: 'エビデンスを追加' })).toBeVisible();
      await expect(page.getByPlaceholder('実施内容や確認事項を記録...')).toBeVisible();

      // Check for evidence type buttons
      await expect(page.getByRole('button', { name: /ファイル/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /URL/ })).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: 'キャンセル' }).click();
      await expect(page.getByRole('heading', { name: 'エビデンスを追加' })).not.toBeVisible();
    }
  });

  test('should display completed tasks with checkmark', async ({ page }) => {
    await page.goto('/workers/worker-1/support-plan');

    // Check for completed items (green checkmark)
    const completedBadges = page.locator('.badge:has-text("完了")');
    const count = await completedBadges.count();

    if (count > 0) {
      // Completed tasks should have a green check icon
      await expect(page.locator('.text-green-500').first()).toBeVisible();
    }
  });

  test('should navigate back when clicking back button', async ({ page }) => {
    // First go to worker detail page
    await page.goto('/workers/worker-1');

    // Then navigate to support plan
    await page.goto('/workers/worker-1/support-plan');

    // Click back button
    await page.getByRole('button').filter({ has: page.locator('svg') }).first().click();

    // Should navigate back (URL should change)
    await expect(page).not.toHaveURL('/workers/worker-1/support-plan');
  });
});

test.describe('Support Plan API Smoke Test', () => {
  test('health endpoint should return ok', async ({ request }) => {
    // Check that API server is running
    const response = await request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
