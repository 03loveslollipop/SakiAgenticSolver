// Sidebar.property.test.tsx - Property-based tests for Sidebar component
import React from 'react';
import fc from 'fast-check';
import { fireEvent, render, screen } from '../../test-utils/render-with-providers';
import { runPropertyTest } from '../../test-utils/test-config';
import { Sidebar, SidebarItem } from './Sidebar';

const collapseLabelMatcher = /collapse sidebar|nav\.collapseSidebar/i;
const expandLabelMatcher = /expand sidebar|nav\.expandSidebar/i;

describe('Sidebar Component Properties', () => {
  runPropertyTest(
    13,
    'Sidebar Collapse Toggle',
    fc.record({
      toggleCount: fc.integer({ min: 1, max: 10 }),
      items: fc.uniqueArray(
        fc.hexaString({ minLength: 1, maxLength: 20 }),
        { minLength: 1, maxLength: 5 }
      ),
    }),
    async ({ toggleCount, items }) => {
      const sidebarItems: SidebarItem[] = items.map((value) => ({
        id: value,
        label: value,
        path: `/${value}`,
        icon: <span>ICON</span>,
      }));

      const { container } = render(<Sidebar items={sidebarItems} collapsible />);
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');

      for (let index = 0; index < toggleCount; index += 1) {
        const isExpanded = sidebar?.classList.contains('w-64');
        const toggleButton = screen.getByLabelText(isExpanded ? collapseLabelMatcher : expandLabelMatcher);
        fireEvent.click(toggleButton);

        if (isExpanded) {
          expect(sidebar).toHaveClass('w-16');
        } else {
          expect(sidebar).toHaveClass('w-64');
        }
      }

      const shouldBeCollapsed = toggleCount % 2 === 1;
      if (shouldBeCollapsed) {
        expect(sidebar).toHaveClass('w-16');
      } else {
        expect(sidebar).toHaveClass('w-64');
      }

      // Labels are only rendered when expanded; expand for link assertions.
      if (shouldBeCollapsed) {
        fireEvent.click(screen.getByLabelText(expandLabelMatcher));
      }

      sidebarItems.forEach((item) => {
        const link = container.querySelector(`a[href="${item.path}"]`);
        expect(link).not.toBeNull();
        expect(link).toHaveAttribute('href', item.path);
        expect(link).toHaveTextContent(item.label);
      });
    }
  );
});

describe('Sidebar Active Navigation Properties', () => {
  runPropertyTest(
    12,
    'Active Navigation Highlighting',
    fc.record({
      items: fc.uniqueArray(
        fc.hexaString({ minLength: 1, maxLength: 20 }),
        { minLength: 2, maxLength: 5 }
      ),
      activeIndex: fc.nat(),
    }),
    ({ items, activeIndex }) => {
      const sidebarItems: SidebarItem[] = items.map((value) => ({
        id: value,
        label: value,
        path: `/${value}`,
        icon: <span>ICON</span>,
      }));

      const activeItem = sidebarItems[activeIndex % sidebarItems.length];
      window.history.pushState({}, 'Test', activeItem.path);

      const { container } = render(<Sidebar items={sidebarItems} />);

      const activeLink = container.querySelector(`a[href="${activeItem.path}"]`);
      expect(activeLink).not.toBeNull();
      expect(activeLink).toHaveClass('bg-accent-cyan');
      expect(activeLink).toHaveClass('text-white');
      expect(activeLink).toHaveClass('border-l-4');
      expect(activeLink).toHaveClass('border-primary-yellow');

      sidebarItems.forEach((item) => {
        if (item.id !== activeItem.id) {
          const link = container.querySelector(`a[href="${item.path}"]`);
          expect(link).not.toBeNull();
          expect(link).not.toHaveClass('bg-accent-cyan');
          expect(link).toHaveClass('hover:bg-neutral-teal');
        }
      });
    }
  );
});
