// Sidebar.test.tsx - Unit tests for Sidebar component
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test-utils/render-with-providers';
import { Sidebar, SidebarItem } from './Sidebar';

const mockItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <span>ICON1</span>, path: '/dashboard' },
  { id: 'vms', label: 'Virtual Machines', icon: <span>ICON2</span>, path: '/vms' },
  { id: 'settings', label: 'Settings', icon: <span>ICON3</span>, path: '/settings' },
];

const mockLogo = <div data-testid="logo">Logo</div>;

const collapseLabelMatcher = /collapse sidebar|nav\.collapseSidebar/i;
const expandLabelMatcher = /expand sidebar|nav\.expandSidebar/i;
const languageLabelMatcher = /select language|common\.selectLanguage/i;

describe('Sidebar Component', () => {
  describe('Rendering', () => {
    it('renders all navigation items', () => {
      render(<Sidebar items={mockItems} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Virtual Machines')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders logo when provided', () => {
      render(<Sidebar items={mockItems} logo={mockLogo} />);
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('renders collapse button when collapsible is true', () => {
      render(<Sidebar items={mockItems} collapsible />);
      expect(screen.getByLabelText(collapseLabelMatcher)).toBeInTheDocument();
    });

    it('does not render collapse button when collapsible is false', () => {
      render(<Sidebar items={mockItems} collapsible={false} />);
      expect(screen.queryByLabelText(collapseLabelMatcher)).not.toBeInTheDocument();
    });

    it('shows full language selector at sidebar bottom when expanded', () => {
      render(<Sidebar items={mockItems} />);
      expect(screen.getByRole('combobox', { name: languageLabelMatcher })).toBeInTheDocument();
    });
  });

  describe('8-bit Styling', () => {
    it('applies dark purple background and teal border', () => {
      const { container } = render(<Sidebar items={mockItems} />);
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('bg-neutral-darkPurple');
      expect(sidebar).toHaveClass('border-r-4');
      expect(sidebar).toHaveClass('border-neutral-teal');
    });
  });

  describe('Active State', () => {
    it('highlights active navigation item', () => {
      window.history.pushState({}, 'Dashboard', '/dashboard');
      render(<Sidebar items={mockItems} />);

      const activeLink = screen.getByText('Dashboard').closest('a');
      expect(activeLink).toHaveClass('bg-accent-cyan');
      expect(activeLink).toHaveClass('border-l-4');
      expect(activeLink).toHaveClass('border-primary-yellow');
    });
  });

  describe('Collapse Functionality', () => {
    it('starts in expanded state', () => {
      const { container } = render(<Sidebar items={mockItems} />);
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');
      expect(sidebar).not.toHaveClass('w-16');
    });

    it('collapses when collapse button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar items={mockItems} />);
      const collapseButton = screen.getByLabelText(collapseLabelMatcher);

      await user.click(collapseButton);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-16');
      expect(sidebar).not.toHaveClass('w-64');
    });

    it('expands when expand button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar items={mockItems} />);
      await user.click(screen.getByLabelText(collapseLabelMatcher));
      await user.click(screen.getByLabelText(expandLabelMatcher));

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');
    });

    it('hides navigation labels when collapsed', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);
      await user.click(screen.getByLabelText(collapseLabelMatcher));

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('shows icon language selector when collapsed', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);
      await user.click(screen.getByLabelText(collapseLabelMatcher));

      expect(screen.getByRole('button', { name: languageLabelMatcher })).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: languageLabelMatcher })).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('renders navigation items as links', () => {
      render(<Sidebar items={mockItems} />);

      expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
      expect(screen.getByText('Virtual Machines').closest('a')).toHaveAttribute('href', '/vms');
    });

    it('renders icons for each navigation item', () => {
      render(<Sidebar items={mockItems} />);

      expect(screen.getByText('ICON1')).toBeInTheDocument();
      expect(screen.getByText('ICON2')).toBeInTheDocument();
      expect(screen.getByText('ICON3')).toBeInTheDocument();
    });
  });
});
