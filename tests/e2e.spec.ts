import { test, expect } from '@playwright/test';

test.describe('ProofGate Main Flow E2E', () => {
  test('navigates through home, library, content submission, findings and revalidation', async ({ page }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await expect(page).toHaveTitle(/ProofGate/i);
    await expect(page.locator('h1')).toContainText('Verify marketing content against approved facts');

    // 2. Visit Library Page
    await page.goto('/library');
    await expect(page.locator('h1')).toContainText('Source Library');
    await expect(page.locator('text=BrightDesk Pro Monthly')).toBeVisible();

    // 3. Visit Content Ingestion & submit Sample A
    await page.goto('/content/new');
    await expect(page.locator('h1')).toContainText('Check New Content');

    // Load Sample A
    const sampleBtn = page.getByRole('button', { name: /Sample A: Launch Poster/i });
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Verify inputs populated
    await expect(page.locator('#title-input')).toHaveValue('BrightDesk Pro Launch Poster');
    await expect(page.locator('#text-input')).not.toBeEmpty();

    // Click "Check content"
    const submitBtn = page.getByRole('button', { name: /Check content/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for redirect to /content/[id] inspection page
    await page.waitForURL(/\/content\/[a-zA-Z0-9_-]+$/, { timeout: 35000 });
    await expect(page.locator('h1')).toBeVisible();

    // 4. Visit Review Page
    await page.goto('/review');
    await expect(page.locator('h1')).toContainText('Review Queue');

    // 5. Visit Revalidation Page
    await page.goto('/revalidation');
    await expect(page.locator('h1')).toContainText('Revalidation Queue');

    // 6. Visit Audit Page
    await page.goto('/audit');
    await expect(page.locator('h1')).toContainText('Audit Log');
  });
});
