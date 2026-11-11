import { test, expect } from '@playwright/test';

test.describe('ProofGate Main Flow E2E', () => {
  test('end-to-end compliance clearance and selective revalidation flow', async ({ page }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await expect(page).toHaveTitle(/ProofGate/i);
    await expect(page.locator('h1')).toContainText('Verify marketing content against approved facts');

    // 2. Visit Content Ingestion & load Sample A
    await page.goto('/content/new');
    await expect(page.locator('h1')).toContainText('Check New Content');

    // Click Sample A: Launch Poster
    const sampleBtn = page.getByRole('button', { name: /Sample A: Launch Poster/i });
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Verify inputs populated
    await expect(page.locator('#title-input')).toHaveValue('BrightDesk Pro Launch Poster');
    await expect(page.locator('#text-input')).not.toBeEmpty();

    // Click "Check content"
    const checkBtn = page.getByRole('button', { name: /Check content/i });
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    // Wait for redirect to /content/[id]
    await page.waitForURL(/\/content\/[a-zA-Z0-9_-]+$/, { timeout: 35000 });
    await expect(page.locator('h1')).toBeVisible();

    // Assert at least 3 blocker findings
    const blockerCards = page.locator('article:has-text("blocker")');
    await expect(blockerCards.first()).toBeVisible({ timeout: 15000 });
    const count = await blockerCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Apply fixes to clear blockers
    // Click "Edit text" button
    const editBtn = page.getByRole('button', { name: /Edit text/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }

    // Replace contradicted copy with approved facts
    const approvedCopy = 'BrightDesk Pro: now just Rs. 499 per user per month.\nTry it free for 14 days.\nReliable 99.9% uptime, always.';
    const editor = page.locator('textarea').first();
    await editor.fill(approvedCopy);

    // Save and re-check as v2
    const saveRecheckBtn = page.getByRole('button', { name: /Save as v2 and re-check|Re-check/i });
    await expect(saveRecheckBtn).toBeEnabled();
    await saveRecheckBtn.click();

    // Wait for blockers to be 0
    await expect(page.locator('text=All blockers resolved')).toBeVisible({ timeout: 25000 });

    // Send for review
    const sendReviewBtn = page.getByRole('button', { name: /Send for review|Submit for Review/i }).first();
    await expect(sendReviewBtn).toBeEnabled();
    await sendReviewBtn.click();

    // Switch role to Reviewer
    const reviewerRoleBtn = page.getByRole('button', { name: 'Reviewer', exact: true });
    await reviewerRoleBtn.click();

    // Open review page
    await page.goto('/review');
    await expect(page.locator('h1')).toContainText('Review Queue');

    // Approve & Create Clearance
    const approveBtn = page.getByRole('button', { name: /Approve & Create Clearance/i });
    await expect(approveBtn).toBeVisible({ timeout: 15000 });
    await approveBtn.click();

    // Verify clearance created
    await expect(page.locator('text=Clearance Certificate Created|Approved & Cleared')).toBeVisible({ timeout: 15000 });

    // Switch to Admin
    const adminRoleBtn = page.getByRole('button', { name: 'Admin', exact: true });
    await adminRoleBtn.click();

    // Open Source Library
    await page.goto('/library');
    await expect(page.locator('h1')).toContainText('Source Library');

    // Open BrightDesk Pro Monthly drawer
    const proMonthlySource = page.locator('text=BrightDesk Pro Monthly').first();
    await expect(proMonthlySource).toBeVisible();
    await proMonthlySource.click();

    // Click "Add Version"
    const addVerBtn = page.getByRole('button', { name: /Add Version/i });
    await expect(addVerBtn).toBeVisible();
    await addVerBtn.click();

    // Fill in new price 699
    const numberInput = page.locator('input[type="number"]');
    await numberInput.fill('699');

    // Fill change note
    const changeNoteInput = page.locator('input[placeholder*="Price updated"]');
    if (await changeNoteInput.isVisible()) {
      await changeNoteInput.fill('Price updated to Rs. 699');
    }

    // Click "Publish Version & Trigger Revalidation"
    const publishBtn = page.getByRole('button', { name: /Publish Version/i });
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // Open Revalidation
    await page.goto('/revalidation');
    await expect(page.locator('h1')).toContainText('Revalidation Queue');

    // Assert the poster appears in the revalidation queue
    await expect(page.locator('text=BrightDesk Pro Launch Poster').first()).toBeVisible({ timeout: 15000 });

    // Open "Why was other content not affected?" accordion
    const notAffectedBtn = page.locator('button:has-text("Why was other content not affected?")');
    await expect(notAffectedBtn).toBeVisible();
    await notAffectedBtn.click();

    // Assert the historical case study is under Not affected
    await expect(page.locator('text=Acme Retail Case Study').first()).toBeVisible({ timeout: 10000 });
  });
});
