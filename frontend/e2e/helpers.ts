import { Page } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Mock backend API responses for testing
 */
export async function mockBackendAPI(page: Page) {
  // Mock GET /api/sessions - list all sessions
  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() === 'GET') {
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
            instructions: 'Test challenge instructions',
            vmIp: '20.10.0.1',
            sshUsername: 'ctfuser',
            sshPort: 22,
            resourceGroup: 'test-rg'
          }
        ])
      });
    } else if (route.request().method() === 'POST') {
      // Mock POST /api/sessions - create new session
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-session-id',
          vmSize: postData.vmSize,
          agentType: postData.agentType,
          agentModel: postData.agentModel,
          createdAt: new Date().toISOString(),
          status: 'creating',
          challengeFiles: postData.challengeUrls,
          instructions: postData.instructions,
          vmIp: null,
          sshUsername: 'ctfuser',
          sshPort: 22,
          resourceGroup: 'test-rg'
        })
      });
    }
  });

  // Mock GET /api/sessions/:id - get session details
  await page.route('**/api/sessions/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    if (method === 'GET' && !url.includes('/ssh') && !url.includes('/agent-md') && !url.includes('/tools-md')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-1',
          vmSize: 'small',
          agentType: 'codex',
          agentModel: 'gpt-4',
          createdAt: new Date().toISOString(),
          status: 'running',
          challengeFiles: ['https://example.com/challenge.bin'],
          instructions: 'Test challenge instructions',
          vmIp: '20.10.0.1',
          sshUsername: 'ctfuser',
          sshPort: 22,
          resourceGroup: 'test-rg'
        })
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Session deleted successfully' })
      });
    }
  });

  // Mock GET /api/sessions/:id/ssh - get SSH connection info
  await page.route('**/api/sessions/*/ssh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hostname: '20.10.0.1',
        port: 22,
        username: 'ctfuser'
      })
    });
  });

  // Mock GET /api/sessions/:id/ssh-key - download SSH key
  await page.route('**/api/sessions/*/ssh-key', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... test-key'
    });
  });

  // Mock GET /api/sessions/:id/agent-md - get AGENT.md content
  await page.route('**/api/sessions/*/agent-md', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: '# Agent Configuration\n\nThis is the agent configuration file.\n\n## Rules\n\n1. Be thorough\n2. Document everything\n3. Ask for help when stuck'
      });
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'AGENT.md updated successfully' })
      });
    }
  });

  // Mock GET /api/sessions/:id/tools-md - get TOOLS.md content
  await page.route('**/api/sessions/*/tools-md', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '# Installed Tools\n\n## Debuggers\n- gdb 12.1\n- radare2 5.8.0\n\n## Decompilers\n- Ghidra 10.3\n\n## Crypto Tools\n- z3 4.12.0'
    });
  });

  // Mock GET /api/sessions/:id/base-prompt - get BASE_PROMPT.md content
  await page.route('**/api/sessions/*/base-prompt', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '# CTF Challenge Agent - System Instructions\n\n**IMPORTANT: This file contains core system instructions and cannot be modified.**\n\n## Your Mission\n\nYou are an AI agent specialized in solving CTF challenges.'
    });
  });

  // Mock GET /api/sessions/:id/changelog - get changelog.md content
  await page.route('**/api/sessions/*/changelog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '# Changelog\n\n[2024-01-15 10:30:00] ls -la\n[2024-01-15 10:31:00] file challenge.bin\n[2024-01-15 10:32:00] strings challenge.bin'
    });
  });

  // Mock GET /api/sessions/:id/discoveries - get discoveries.md content
  await page.route('**/api/sessions/*/discoveries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '# Discoveries\n\n## Initial Analysis\n\nThe binary appears to be a 64-bit ELF executable.\n\n## Vulnerabilities\n\nFound buffer overflow in main function.'
    });
  });

  // Mock WebSocket connection for terminal
  // Note: Playwright doesn't easily mock WebSocket, so we'll skip terminal interaction in basic tests
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, url: string) {
  await page.waitForURL(url, { timeout: 5000 });
}

/**
 * Fill form field and wait for it to be updated
 */
export async function fillField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await page.waitForTimeout(100); // Small delay to ensure state updates
}

/**
 * Click button and wait for action to complete
 */
export async function clickAndWait(page: Page, selector: string, waitTime: number = 500) {
  await page.click(selector);
  await page.waitForTimeout(waitTime);
}
