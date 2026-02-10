# End-to-End Tests with Playwright

This directory contains comprehensive E2E tests for the CTF Automation Platform frontend.

## Overview

The E2E tests verify the complete user workflows and interactions with the application:

1. **VM Creation** (`01-create-vm.spec.ts`) - Tests the complete workflow of creating a new VM session
2. **Session List** (`02-session-list.spec.ts`) - Tests the dashboard and session listing functionality
3. **Terminal Interaction** (`03-terminal-interaction.spec.ts`) - Tests the terminal component and WebSocket connection
4. **AGENT.md Editing** (`04-edit-agent-md.spec.ts`) - Tests editing and saving the AGENT.md configuration file
5. **Session Deletion** (`05-delete-session.spec.ts`) - Tests deleting a session and cleanup

## Prerequisites

- Node.js and npm installed
- Frontend dependencies installed (`npm install`)
- Playwright browsers installed (`npx playwright install`)

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test e2e/01-create-vm.spec.ts
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

Each test file follows this structure:

```typescript
import { test, expect } from '@playwright/test';
import { mockBackendAPI } from './helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Mock API, navigate to page
    await mockBackendAPI(page);
    await page.goto('/path');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Mocking Backend API

The tests use mocked backend API responses to ensure:
- Tests run quickly without real backend
- Tests are deterministic and reliable
- Tests can simulate error conditions

The `helpers.ts` file contains the `mockBackendAPI()` function that sets up all necessary API mocks.

## Test Coverage

### 01-create-vm.spec.ts
- ✅ Create VM with valid inputs
- ✅ Show validation errors for empty form
- ✅ Validate challenge URL format
- ✅ Allow canceling VM creation
- ✅ Display loading state during creation

### 02-session-list.spec.ts
- ✅ Display list of sessions
- ✅ Display session details (VM size, agent, status)
- ✅ Navigate to session detail on click
- ✅ Show "Create New VM" button
- ✅ Navigate to create form
- ✅ Display empty state when no sessions
- ✅ Display loading state while fetching
- ✅ Handle API errors gracefully

### 03-terminal-interaction.spec.ts
- ✅ Display terminal component
- ✅ Show terminal tab/section
- ✅ Display terminal with proper styling (xterm.js)
- ✅ Allow focusing on terminal
- ✅ Handle terminal resize
- ✅ Display terminal in session layout
- ✅ Handle WebSocket errors gracefully
- ✅ Display tabs for different views

### 04-edit-agent-md.spec.ts
- ✅ Display AGENT.md content
- ✅ Have edit button for AGENT.md
- ✅ Enter edit mode when clicking edit
- ✅ Allow editing content
- ✅ Save changes
- ✅ Cancel editing
- ✅ Display success message after saving
- ✅ Handle save errors gracefully
- ✅ Show AGENT.md as editable, BASE_PROMPT.md as read-only

### 05-delete-session.spec.ts
- ✅ Have delete button on session detail
- ✅ Show confirmation dialog
- ✅ Delete session and navigate to dashboard
- ✅ Cancel deletion
- ✅ Show loading state during deletion
- ✅ Handle deletion errors
- ✅ Remove session from dashboard list
- ✅ Display delete button with appropriate styling

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Test directory**: `./e2e`
- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Browser**: Chromium (can be extended to Firefox, WebKit)
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML report
- **Web Server**: Automatically starts Vite dev server before tests

## Debugging Tests

### Debug in UI mode
```bash
npm run test:e2e:ui
```

### Debug specific test
```bash
npx playwright test --debug e2e/01-create-vm.spec.ts
```

### View trace for failed tests
Traces are automatically captured on first retry. View them with:
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

The tests are configured to run in CI environments:
- Retries enabled (2 retries)
- Single worker (no parallel execution)
- Fails build if `test.only` is left in code
- Captures screenshots on failure
- Generates HTML report

## Limitations

### WebSocket Testing
Full WebSocket testing is limited in Playwright. The terminal tests focus on:
- UI elements and layout
- Component rendering
- Error handling
- User interactions

For comprehensive WebSocket testing, consider:
- Backend integration tests
- Manual testing with real backend
- WebSocket-specific testing tools

### API Mocking
Tests use mocked API responses. For full integration testing:
- Run tests against real backend (staging environment)
- Use Docker Compose to spin up backend + MongoDB
- Configure `baseURL` to point to backend

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Mock external dependencies** (API, WebSocket)
3. **Test user workflows** not implementation details
4. **Keep tests independent** - each test should work in isolation
5. **Use meaningful test names** that describe the behavior
6. **Handle timing issues** with proper waits, not arbitrary timeouts
7. **Clean up after tests** - reset state, close connections

## Troubleshooting

### Tests fail with "Timeout waiting for..."
- Increase timeout in test or config
- Check if element selector is correct
- Verify mock API is set up correctly

### Tests pass locally but fail in CI
- Check viewport size differences
- Verify CI has necessary dependencies
- Check for timing issues (use proper waits)

### Terminal tests fail
- Verify xterm.js is loaded
- Check WebSocket mock setup
- Ensure terminal component renders

### Form validation tests fail
- Check if validation is client-side or server-side
- Verify form field selectors
- Check validation error selectors

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add accessibility testing (axe-core)
- [ ] Add performance testing
- [ ] Test with real backend in staging
- [ ] Add mobile viewport tests
- [ ] Add cross-browser testing (Firefox, Safari)
- [ ] Add API contract testing
- [ ] Add load testing for concurrent users

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [xterm.js Documentation](https://xtermjs.org/)
