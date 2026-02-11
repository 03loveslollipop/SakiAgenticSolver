// Sidebar.property.test.tsx - Property-based tests for Sidebar component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { Sidebar, SidebarItem } from './Sidebar';
import { runPropertyTest } from '../../test-utils/test-config';

describe('Sidebar Component Properties', () => {
  runPropertyTest(
    13,
    'Sidebar Collapse Toggle',
    fc.record({
      toggleCount: fc.integer({ min: 1, max: 10 }),
      items: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          label: fc.string({ minLength: 1, maxLength: 30 }),
          path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s}`),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    }),
    async ({ toggleCount, items }) => {
      const sidebarItems: SidebarItem[] = items.map(item => ({
        ...item,
        icon: <span>🔹</span>,
      }));

      const { container } = render(<Sidebar items={sidebarItems} collapsible={true} />);
      const sidebar = container.querySelector('aside');
      
      // Initial state should be expanded
      expect(sidebar).toHaveClass('w-64');
      
      // Toggle multiple times
      for (let i = 0; i < toggleCount; i++) {
        const isCurrentlyExpanded = sidebar?.classList.contains('w-64');
        const buttonLabel = isCurrentlyExpanded ? 'Collapse sidebar' : 'Expand sidebar';
        const button = screen.getByLabelText(buttonLabel);
        
        await userEvent.click(button);
        
        // Verify state toggled correctly
        if (isCurrentlyExpanded) {
          expect(sidebar).toHaveClass('w-16');
          expect(sidebar).not.toHaveClass('w-64');
        } else {
          expect(sidebar).toHaveClass('w-64');
          expect(sidebar).not.toHaveClass('w-16');
        }
      }
      
      // Verify final state is correct based on toggle count
      const shouldBeCollapsed = toggleCount % 2 === 1;
      if (shouldBeCollapsed) {
        expect(sidebar).toHaveClass('w-16');
      } else {
        expect(sidebar).toHaveClass('w-64');
      }
      
      // Verify navigation functionality is preserved
      sidebarItems.forEach(item => {
        const link = screen.getByText(item.label).closest('a');
        expect(link).toHaveAttribute('href', item.path);
      });
    }
  );
});


describe('Sidebar Active Navigation Properties', () => {
  runPropertyTest(
    12,
    'Active Navigation Highlighting',
    fc.record({
      items: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          label: fc.string({ minLength: 1, maxLength: 30 }),
          path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s}`),
        }),
        { minLength: 2, maxLength: 5 }
      ),
      activeIndex: fc.nat(),
    }),
    ({ items, activeIndex }) => {
      const sidebarItems: SidebarItem[] = items.map(item => ({
        ...item,
        icon: <span>🔹</span>,
      }));

      const activeItem = sidebarItems[activeIndex % sidebarItems.length];
      
      // Set the current route to the active item's path
      window.history.pushState({}, 'Test', activeItem.path);
      
      render(<Sidebar items={sidebarItems} />);
      
      // Verify the active item is highlighted
      const activeLink = screen.getByText(activeItem.label).closest('a');
      expect(activeLink).toHaveClass('bg-accent-cyan');
      expect(activeLink).toHaveClass('text-white');
      expect(activeLink).toHaveClass('border-l-4');
      expect(activeLink).toHaveClass('border-primary-yellow');
      
      // Verify other items are not highlighted
      sidebarItems.forEach((item) => {
        if (item.id !== activeItem.id) {
          const link = screen.getByText(item.label).closest('a');
          expect(link).not.toHaveClass('bg-accent-cyan');
          expect(link).toHaveClass('hover:bg-neutral-teal');
        }
      });
    }
  );
});
