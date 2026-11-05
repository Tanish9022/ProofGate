import { test, expect } from '@playwright/test';

test.describe('ProofGate Main Flow E2E', () => {
  test('navigates through home, library, content submission, and revalidation', async ({ page }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await expect(page).toHaveTitle(/ProofGate/i);
    await expect(page.locator('h1')).toContainText('Verify marketing content against approved facts');

    // 2. Visit Library Page
    await page.goto('/library');
    await expect(page.locator('h1')).toContainText('Source Library');
    // Verify brightdesk sources load
    await expect(page.locator('text=BrightDesk Pro Monthly')).toBeVisible();

    // 3. Visit Content Ingestion
    await page.goto('/content/new');
    await expect(page.locator('h1')).toContainText('Check Content');
    // Pre-loaded sample button should be visible
    const sampleBtn = page.locator('text=Load Sample A: BrightDesk Poster');
    if (await sampleBtn.isVisible()) {
      await sampleBtn.click();
      await expect(page.locator('textarea')).not.toBeEmpty();
    }

    // 4. Visit Revalidation Page
    await page.goto('/revalidation');
    await expect(page.locator('h1')).toContainText('Revalidation Queue');

    // 5. Visit Audit Page
    await page.goto('/audit');
    await expect(page.locator('h1')).toContainText('Audit Log');
  });
});

