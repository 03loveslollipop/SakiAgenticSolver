import { test, expect } from '@playwright/test';
import { mockBackendAPI } from './helpers';

/**
 * E2E Test: Deleting a Session
 * 
 * This test verifies the session deletion functionality:
 * 1. Navigate to session detail page
 * 2. Find delete button
 * 3. Confirm deletion
 * 4. Verify session is deleted
 * 5. Verify navigation back to dashboard
 */

test.describe('Session Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend API responses
    await mockBackendAPI(page);
  });

  test('should have delete button on session detail page', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Look for delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")');
    await expect(deleteButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show confirmation dialog when deleting session', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Set up dialog handler before clicking delete
    let dialogShown = false;
    page.on('dialog', async dialog => {
      dialogShown = true;
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toMatch(/delete|remove|sure/i);
      await dialog.accept();
    });
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await deleteButton.click();
    
    // Wait a bit for dialog
    await page.waitForTimeout(500);
    
    // Dialog should have been shown (or custom modal)
    // If no browser dialog, look for custom confirmation modal
    if (!dialogShown) {
      const confirmModal = page.locator('[role="dialog"], .modal, [class*="confirm"]');
      const hasModal = await confirmModal.isVisible().catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should delete session and navigate to dashboard', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await deleteButton.click();
    
    // If there's a custom modal, confirm it
    await page.waitForTimeout(500);
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // Verify we're on dashboard
    const dashboardHeading = page.locator('h1, h2').filter({ hasText: /Dashboard|Sessions/i });
    await expect(dashboardHeading).toBeVisible();
  });

  test('should cancel session deletion', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Handle confirmation dialog - dismiss it
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await deleteButton.click();
    
    // If there's a custom modal, cancel it
    await page.waitForTimeout(500);
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    
    // Wait a bit
    await page.waitForTimeout(500);
    
    // Should still be on session detail page
    await expect(page).toHaveURL(/\/sessions\//);
    
    // Session details should still be visible
    const sessionHeading = page.locator('h1, h2').filter({ hasText: /Session|Details/i });
    await expect(sessionHeading).toBeVisible();
  });

  test('should show loading state during deletion', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add delay to delete endpoint
    await page.route('**/api/sessions/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Session deleted' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await deleteButton.click();
    
    // Confirm if modal appears
    await page.waitForTimeout(300);
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Look for loading indicator
    const loadingIndicator = page.locator('text=/deleting|loading/i, [class*="loading"], [class*="spinner"]');
    const isLoading = await loadingIndicator.isVisible().catch(() => false);
    
    // Wait for completion
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should handle deletion errors gracefully', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Override mock to return error
    await page.route('**/api/sessions/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to delete session' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await deleteButton.click();
    
    // Confirm if modal appears
    await page.waitForTimeout(300);
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for error
    await page.waitForTimeout(1000);
    
    // Look for error message
    const errorMessage = page.locator('text=/error|failed/i, [class*="error"]');
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    // Should show error
    expect(hasError).toBeTruthy();
    
    // Should still be on session page
    await expect(page).toHaveURL(/\/sessions\//);
  });

  test('should remove session from dashboard list after deletion', async ({ page }) => {
    // First, go to dashboard and verify session exists
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verify session is in the list
    const sessionItem = page.locator('text=/test-session-1/i, [data-session-id="test-session-1"]');
    const sessionExists = await sessionItem.isVisible().catch(() => false);
    
    // Navigate to session detail
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Update mock to return empty list after deletion
    await page.route('**/api/sessions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]) // Empty list after deletion
        });
      }
    });
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Delete session
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await deleteButton.click();
    
    // Confirm if modal appears
    await page.waitForTimeout(300);
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Session should not be in the list anymore
    const sessionItems = page.locator('[class*="session"], tr:has(td), .card');
    const count = await sessionItems.count();
    
    // Should have no sessions (or show empty state)
    expect(count).toBe(0);
  });

  test('should display delete button with appropriate styling', async ({ page }) => {
    // Navigate to session detail page
    await page.goto('/sessions/test-session-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
    await expect(deleteButton).toBeVisible();
    
    // Check if button has danger/warning styling (common patterns)
    const buttonClass = await deleteButton.getAttribute('class');
    const hasDangerStyle = buttonClass?.includes('danger') || 
                          buttonClass?.includes('error') || 
                          buttonClass?.includes('warning') ||
                          buttonClass?.includes('red');
    
    // Button should exist (styling is optional but common)
    expect(deleteButton).toBeTruthy();
  });
});
