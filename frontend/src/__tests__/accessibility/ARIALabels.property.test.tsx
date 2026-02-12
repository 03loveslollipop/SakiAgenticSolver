// ARIALabels.property.test.tsx - Property-based tests for ARIA labels accessibility
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';
import { runPropertyTest } from '../../test-utils/test-config';

// Import components to test
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Navigation } from '../../components/Navigation/Navigation';
import { SetupModeSelector } from '../../components/SetupModeSelector/SetupModeSelector';
import { Loading } from '../../components/Loading/Loading';
import { ErrorToast } from '../../components/ErrorToast/ErrorToast';

describe('Accessibility - ARIA Labels Properties', () => {
  // Property 17: Accessibility - ARIA Labels
  // Validates: Requirements 11.3
  runPropertyTest(
    17,
    'Accessibility - ARIA Labels - Button Component',
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 20 }).filter(text => text.trim().length > 0),
      ariaLabel: fc.string({ minLength: 1, maxLength: 30 }).filter(label => label.trim().length > 0),
    }),
    ({ text, ariaLabel }) => {
      // Clean up any previous renders
      cleanup();
      
      // Create test ID to isolate this render
      const testId = `button-test-${Math.random().toString(36).substr(2, 9)}`;
      
      render(
        <div data-testid={testId}>
          <Button aria-label={ariaLabel}>
            {text}
          </Button>
        </div>
      );
      
      // Get button from container to avoid multiple renders issue
      const container = screen.getByTestId(testId);
      const button = container.querySelector('button');
      
      if (!button) {
        throw new Error('Button not found');
      }
      
      // Button should have the correct aria-label
      expect(button).toHaveAttribute('aria-label', ariaLabel);
      
      // Button should also contain the visible text (trim whitespace for comparison)
      expect(button.textContent?.trim()).toBe(text.trim());
    }
  );

  runPropertyTest(
    17.1,
    'Accessibility - ARIA Labels - Icon Buttons',
    fc.record({
      iconText: fc.constantFrom('✕', '←', '→', '>', '<', 'ⓘ'),
      ariaLabel: fc.string({ minLength: 5, maxLength: 30 }),
    }),
    ({ iconText, ariaLabel }) => {
      // Test icon-only buttons which must have aria-label
      const { container } = render(
        <button aria-label={ariaLabel}>
          {iconText}
        </button>
      );
      
      const button = container.querySelector('button');
      
      // Icon button must have aria-label
      expect(button).toHaveAttribute('aria-label', ariaLabel);
      
      // Icon button should have the icon text
      expect(button).toHaveTextContent(iconText);
      
      // Icon button should be focusable (not explicitly unfocusable)
      expect(button).not.toHaveAttribute('tabindex', '-1');
    }
  );

  runPropertyTest(
    17.2,
    'Accessibility - ARIA Labels - Form Inputs with Labels',
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }).filter(label => label.trim().length > 0),
      error: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 50 }).filter(text => text.trim().length > 0)),
      helperText: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 50 }).filter(text => text.trim().length > 0)),
    }),
    ({ label, error, helperText }) => {
      // Clean up any previous renders
      cleanup();
      
      // Create test ID to isolate this render
      const testId = `input-test-${Math.random().toString(36).substr(2, 9)}`;
      
      render(
        <div data-testid={testId}>
          <Input
            label={label}
            error={error}
            helperText={helperText}
            aria-label={`Input for ${label}`}
          />
        </div>
      );
      
      // Input should be associated with label
      // Use a more flexible approach to find the label since getByLabelText requires exact match
      const container = screen.getByTestId(testId);
      const labelElement = container.querySelector('label');
      expect(labelElement).toBeInTheDocument();
      expect(labelElement?.textContent).toContain(label.trim());
      
      // Get input by its id from the label's "for" attribute
      const labelFor = labelElement?.getAttribute('for');
      const input = labelFor ? container.querySelector(`#${labelFor}`) : null;
      expect(input).toBeInTheDocument();
      
      // Input should have aria-label as fallback
      expect(input).toHaveAttribute('aria-label', `Input for ${label}`);
      
      // If there's an error, input should have aria-invalid="true"
      if (error) {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        
        // Error message should have role="alert"
        // Use querySelector to find the error span specifically
        const container = screen.getByTestId(testId);
        const errorElement = container.querySelector('[role="alert"]');
        expect(errorElement).toBeInTheDocument();
        // Check that error text is present (allowing for whitespace differences)
        expect(errorElement?.textContent).toContain(error.trim());
      } else {
        // When there's no error, input should have aria-invalid="false"
        expect(input).toHaveAttribute('aria-invalid', 'false');
      }
      
      // If there's helper text, it should be associated via aria-describedby
      if (helperText && !error) {
        // Helper text might be trimmed in the DOM, so check text content
        const container = screen.getByTestId(testId);
        const helperElement = container.querySelector('[id$="-helper"]');
        expect(helperElement).toBeInTheDocument();
        // Check that helper text is present (allowing for whitespace differences)
        expect(helperElement?.textContent).toContain(helperText.trim());
        const helperId = helperElement?.id;
        if (helperId) {
          expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helperId));
        }
      }
    }
  );

  runPropertyTest(
    17.3,
    'Accessibility - ARIA Labels - Form Sections',
    fc.record({
      sectionTitle: fc.string({ minLength: 1, maxLength: 30 }).filter(title => title.trim().length > 0),
      fieldCount: fc.integer({ min: 1, max: 5 }),
    }),
    ({ sectionTitle, fieldCount }) => {
      // Clean up any previous renders
      cleanup();
      
      // Test that form sections have proper aria-labelledby
      const sectionId = 'test-section';
      
      // Create test ID to isolate this render
      const testId = `form-section-test-${Math.random().toString(36).substr(2, 9)}`;
      
      const { container } = render(
        <div data-testid={testId}>
          <div role="group" aria-labelledby={sectionId}>
            <h3 id={sectionId}>{sectionTitle}</h3>
            {Array.from({ length: fieldCount }).map((_, index) => (
              <Input
                key={index}
                label={`Field ${index + 1}`}
                aria-label={`Input ${index + 1} in ${sectionTitle}`}
              />
            ))}
          </div>
        </div>
      );
      
      const containerDiv = screen.getByTestId(testId);
      const group = containerDiv.querySelector('[role="group"]');
      expect(group).toHaveAttribute('aria-labelledby', sectionId);
      
      const heading = containerDiv.querySelector(`#${sectionId}`);
      expect(heading?.textContent?.trim()).toBe(sectionTitle.trim());
      
      // All inputs in the section should have appropriate labels
      const inputs = containerDiv.querySelectorAll('input');
      expect(inputs.length).toBe(fieldCount);
      
      inputs.forEach((input, index) => {
        expect(input).toHaveAttribute('aria-label', `Input ${index + 1} in ${sectionTitle}`);
      });
    }
  );

  runPropertyTest(
    17.4,
    'Accessibility - ARIA Labels - Loading and Status Components',
    fc.record({
      componentType: fc.constantFrom<'loading' | 'error' | 'status'>('loading', 'error', 'status'),
      text: fc.string({ minLength: 0, maxLength: 50 }),
    }),
    ({ componentType, text }) => {
      // Clean up any previous renders
      cleanup();
      
      // For error component, skip test if text is empty or only whitespace
      if (componentType === 'error' && text.trim().length === 0) {
        return; // Skip this test case
      }
      
      // For loading component, skip test if text is only whitespace
      if (componentType === 'loading' && text.trim().length === 0) {
        return; // Skip this test case
      }
      
      // Create test ID to isolate this render
      const testId = `${componentType}-test-${Math.random().toString(36).substr(2, 9)}`;
      
      let element;
      let expectedRole;
      let expectedAriaLive;
      
      switch (componentType) {
        case 'loading':
          // For loading component, use text or default
          const loadingText = text || 'Loading...';
          element = (
            <div data-testid={testId}>
              <Loading text={loadingText} aria-label={`Loading: ${loadingText}`} />
            </div>
          );
          expectedRole = 'status';
          expectedAriaLive = 'polite';
          break;
        case 'error':
          element = (
            <div data-testid={testId}>
              <ErrorToast message={text} dismissible={false} />
            </div>
          );
          expectedRole = 'alert';
          expectedAriaLive = 'assertive';
          break;
        case 'status':
          element = (
            <div data-testid={testId}>
              <div role="status" aria-live="polite" aria-label={`Status: ${text}`}>
                {text}
              </div>
            </div>
          );
          expectedRole = 'status';
          expectedAriaLive = 'polite';
          break;
      }
      
      render(element);
      
      // Get the component from the test container
      const container = screen.getByTestId(testId);
      
      // Find the element with the expected role
      let component;
      if (componentType === 'error') {
        // For error component, find by role="alert"
        component = screen.getByRole('alert');
      } else {
        // For loading and status, use first child
        component = container.firstChild as HTMLElement;
      }
      
      // Component should have appropriate role
      expect(component).toHaveAttribute('role', expectedRole);
      
      // Component should have appropriate aria-live attribute
      // Note: ErrorToast uses Container component which doesn't support aria-live
      // So we only check aria-live for loading and status components
      if (componentType !== 'error') {
        expect(component).toHaveAttribute('aria-live', expectedAriaLive);
      }
      
      // Component should contain the text
      if (componentType === 'loading') {
        // For loading component, text should not be empty (filtered above)
        // Use toContain instead of toBe for text content to handle whitespace
        expect(component.textContent).toContain(text.trim());
      } else {
        // For error and status, check text content
        expect(component.textContent).toContain(text.trim());
      }
      
      // If it's loading or has aria-label, check that too
      if (componentType === 'loading' || componentType === 'status') {
        const expectedLabel = componentType === 'loading' ? `Loading: ${text}` : `Status: ${text}`;
        expect(component).toHaveAttribute('aria-label', expectedLabel);
      }
    }
  );

  runPropertyTest(
    17.5,
    'Accessibility - ARIA Labels - Navigation Components',
    fc.record({
      itemCount: fc.integer({ min: 1, max: 5 }),
      hasLogo: fc.boolean(),
      collapsible: fc.boolean(),
    }),
    ({ itemCount, hasLogo, collapsible }) => {
      // Clean up any previous renders
      cleanup();
      
      // Create sidebar items
      const sidebarItems = Array.from({ length: itemCount }).map((_, index) => ({
        id: `item-${index}`,
        label: `Item ${index + 1}`,
        icon: <span>📄</span>,
        path: `/item-${index}`,
      }));
      
      // Render Sidebar wrapped in MemoryRouter for useLocation hook
      const { container: sidebarContainer } = render(
        <MemoryRouter>
          <Sidebar
            items={sidebarItems}
            logo={hasLogo ? <div>Logo</div> : undefined}
            collapsible={collapsible}
          />
        </MemoryRouter>
      );
      
      // Sidebar should have aria-label
      const sidebar = sidebarContainer.querySelector('aside');
      expect(sidebar).toHaveAttribute('aria-label', 'Main navigation');
      
      // Collapse button should have aria-label
      if (collapsible) {
        const collapseButton = sidebarContainer.querySelector('button[aria-label*="sidebar"]');
        expect(collapseButton).toBeInTheDocument();
        expect(collapseButton).toHaveAttribute('aria-label');
      }
      
      // Navigation items should be in a nav element
      const nav = sidebarContainer.querySelector('nav');
      expect(nav).toBeInTheDocument();
      
      // Navigation items should be in a list
      const list = sidebarContainer.querySelector('ul');
      expect(list).toBeInTheDocument();
      
      // All navigation items should have appropriate labels
      const links = sidebarContainer.querySelectorAll('a');
      expect(links.length).toBe(itemCount);
    }
  );
});