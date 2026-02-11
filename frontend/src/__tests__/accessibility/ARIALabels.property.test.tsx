// ARIALabels.property.test.tsx - Property-based tests for ARIA labels accessibility
import React from 'react';
import { render, screen } from '@testing-library/react';
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
      text: fc.string({ minLength: 1, maxLength: 20 }),
      ariaLabel: fc.string({ minLength: 1, maxLength: 30 }),
    }),
    ({ text, ariaLabel }) => {
      render(
        <Button aria-label={ariaLabel}>
          {text}
        </Button>
      );
      
      const button = screen.getByRole('button', { name: ariaLabel });
      
      // Button should have the correct aria-label
      expect(button).toHaveAttribute('aria-label', ariaLabel);
      
      // Button should also contain the visible text
      expect(button).toHaveTextContent(text);
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
      label: fc.string({ minLength: 1, maxLength: 20 }),
      error: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 50 })),
      helperText: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 50 })),
    }),
    ({ label, error, helperText }) => {
      render(
        <Input
          label={label}
          error={error}
          helperText={helperText}
          aria-label={`Input for ${label}`}
        />
      );
      
      // Input should be associated with label
      const input = screen.getByLabelText(label);
      expect(input).toBeInTheDocument();
      
      // Input should have aria-label as fallback
      expect(input).toHaveAttribute('aria-label', `Input for ${label}`);
      
      // If there's an error, input should have aria-invalid
      if (error) {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        
        // Error message should have role="alert"
        const errorElement = screen.getByText(error);
        expect(errorElement).toHaveAttribute('role', 'alert');
      } else {
        expect(input).not.toHaveAttribute('aria-invalid');
      }
      
      // If there's helper text, it should be associated via aria-describedby
      if (helperText && !error) {
        const helperElement = screen.getByText(helperText);
        const helperId = helperElement.id;
        expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helperId));
      }
    }
  );

  runPropertyTest(
    17.3,
    'Accessibility - ARIA Labels - Form Sections',
    fc.record({
      sectionTitle: fc.string({ minLength: 1, maxLength: 30 }),
      fieldCount: fc.integer({ min: 1, max: 5 }),
    }),
    ({ sectionTitle, fieldCount }) => {
      // Test that form sections have proper aria-labelledby
      const sectionId = 'test-section';
      
      const { container } = render(
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
      );
      
      const group = container.querySelector('[role="group"]');
      expect(group).toHaveAttribute('aria-labelledby', sectionId);
      
      const heading = container.querySelector(`#${sectionId}`);
      expect(heading).toHaveTextContent(sectionTitle);
      
      // All inputs in the section should have appropriate labels
      const inputs = container.querySelectorAll('input');
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
      text: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    ({ componentType, text }) => {
      let element;
      let expectedRole;
      let expectedAriaLive;
      
      switch (componentType) {
        case 'loading':
          element = <Loading text={text} aria-label={`Loading: ${text}`} />;
          expectedRole = 'status';
          expectedAriaLive = 'polite';
          break;
        case 'error':
          element = <ErrorToast message={text} dismissible={false} />;
          expectedRole = 'alert';
          expectedAriaLive = 'assertive';
          break;
        case 'status':
          element = (
            <div role="status" aria-live="polite" aria-label={`Status: ${text}`}>
              {text}
            </div>
          );
          expectedRole = 'status';
          expectedAriaLive = 'polite';
          break;
      }
      
      const { container } = render(element);
      
      // Component should have appropriate role
      const component = container.firstChild as HTMLElement;
      expect(component).toHaveAttribute('role', expectedRole);
      
      // Component should have appropriate aria-live attribute
      expect(component).toHaveAttribute('aria-live', expectedAriaLive);
      
      // Component should contain the text
      expect(component).toHaveTextContent(text);
      
      // If it's loading or has aria-label, check that too
      if (componentType === 'loading' || componentType === 'status') {
        expect(component).toHaveAttribute('aria-label', expect.stringContaining(text));
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
      // Create sidebar items
      const sidebarItems = Array.from({ length: itemCount }).map((_, index) => ({
        id: `item-${index}`,
        label: `Item ${index + 1}`,
        icon: <span>📄</span>,
        path: `/item-${index}`,
      }));
      
      // Render Sidebar
      const { container: sidebarContainer } = render(
        <Sidebar
          items={sidebarItems}
          logo={hasLogo ? <div>Logo</div> : undefined}
          collapsible={collapsible}
        />
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