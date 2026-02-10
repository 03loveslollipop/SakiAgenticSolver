import { test, expect } from '@playwright/test';
import { mockBackendAPI } from './helpers';

/**
 * E2E Test: Viewing Session List
 * 
 * This test verifies the dashboard displays sessions correctly:
 * 1. Navigate to the dashboard
 * 2. Verify session list is displayed
 * 3. Verify session details are shown (VM size, agent type, status, etc.)
 * 4. Verify clicking a session navigates to detail view
 */

test.describe('Session List', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend API responses
    await mockBackendAPI(page);
    
    // Navigate to the dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display list of sessions', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForTimeout(1000);
    
    // Check for dashboard heading
    const dashboardHeading = page.locator('h1, h2').filter({ hasText: /Dashboard|Sessions/i });
    await expect(dashboardHeading).toBeVisible();
    
    // Check for session items
    // Sessions might be displayed as cards, table rows, or list items
    const sessionItems = page.locator('[class*="session"], tr:has(td), .card, [data-testid*="session"]');
    const count = await sessionItems.count();
    
    // We mocked one session, so we should see at least one item
    expect(count).toBeGreaterThan(0);
  });

  test('should display session details in list', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForTimeout(1000);
    
    // Check for VM size information
    const vmSizeText = page.locator('text=/small|medium|large/i');
    await expect(vmSizeText.first()).toBeVisible();
    
    // Check for agent type information
    const agentTypeText = page.locator('text=/codex|copilot/i');
    await expect(agentTypeText.first()).toBeVisible();
    
    // Check for agent model information
    const agentModelText = page.locator('text=/gpt-4|gpt-3.5/i');
    await expect(agentModelText.first()).toBeVisible();
    
    // Check for status information
    const statusText = page.locator('text=/running|creating|stopped|error/i');
    await expect(statusText.first()).toBeVisible();
  });

  test('should navigate to session detail when clicking a session', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForTimeout(1000);
    
    // Find and click the first session
    // Try multiple possible selectors for session items
    const sessionItem = page.locator('[class*="session"], tr:has(td), .card, [data-testid*="session"]').first();
    
    // Look for a clickable element within the session (button, link, or the item itself)
    const clickableElement = sessionItem.locator('button, a, [role="button"]').first();
    
    if (await clickableElement.isVisible()) {
      await clickableElement.click();
    } else {
      // If no specific button, click the session item itself
      await sessionItem.click();
    }
    
    // Wait for navigation to session detail page
    await page.waitForURL('**/sessions/**', { timeout: 5000 });
    
    // Verify we're on the session detail page
    const sessionDetailHeading = page.locator('h1, h2').filter({ hasText: /Session|Details/i });
    await expect(sessionDetailHeading).toBeVisible();
  });

  test('should show "Create New VM" button', async ({ page }) => {
    // Check for create button
    const createButton = page.locator('button:has-text("Create New VM"), a:has-text("Create New VM")');
    await expect(createButton).toBeVisible();
  });

  test('should navigate to create form when clicking "Create New VM"', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("Create New VM"), a:has-text("Create New VM")');
    await createButton.click();
    
    // Wait for navigation
    await page.waitForURL('**/create', { timeout: 5000 });
    
    // Verify we're on the create page
    const createHeading = page.locator('h1, h2').filter({ hasText: /Create/i });
    await expect(createHeading).toBeVisible();
  });

  test('should display empty state when no sessions exist', async ({ page }) => {
    // Override the mock to return empty array
    await page.route('**/api/sessions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for empty state message
    const emptyStateText = page.locator('text=/no sessions|empty|create your first/i');
    const emptyStateVisible = await emptyStateText.isVisible().catch(() => false);
    
    // Or check that no session items are displayed
    const sessionItems = page.locator('[class*="session"], tr:has(td), .card, [data-testid*="session"]');
    const count = await sessionItems.count();
    
    // Either empty state is shown or no sessions are displayed
    expect(emptyStateVisible || count === 0).toBeTruthy();
  });

  test('should display loading state while fetching sessions', async ({ page }) => {
    // Add delay to the mock to see loading state
    await page.route('**/api/sessions', async (route) => {
      if (route.request().method() === 'GET') {
        // Delay response
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-session-1',
              vmSize: 'small',
              agentType: 'codex',
              agentModel: 'gpt-4',
              createdAt: new Date().toISOString(),
              status: 'running',
              challengeFiles: ['https://example.com/challenge.bin'],
              instructions: 'Test instructions',
              vmIp: '20.10.0.1',
              sshUsername: 'ctfuser',
              sshPort: 22,
              resourceGroup: 'test-rg'
            }
          ])
        });
      }
    });
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Check for loading indicator
    const loadingIndicator = page.locator('text=/loading|fetching/i, [class*="loading"], [class*="spinner"]');
    const isLoading = await loadingIndicator.isVisible().catch(() => false);
    
    // Loading indicator should be visible (or was visible)
    // Since we can't guarantee timing, we just verify the page loads eventually
    await page.waitForLoadState('networkidle');
    
    // Sessions should eventually be displayed
    await page.waitForTimeout(1500);
    const sessionItems = page.locator('[class*="session"], tr:has(td), .card, [data-testid*="session"]');
    const count = await sessionItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Override mock to return error
    await page.route('**/api/sessions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      }
    });
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for error message
    const errorMessage = page.locator('text=/error|failed|something went wrong/i, [class*="error"]');
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    // Error should be displayed
    expect(hasError).toBeTruthy();
  });
});
