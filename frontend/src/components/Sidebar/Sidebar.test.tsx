// Sidebar.test.tsx - Unit tests for Sidebar component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { Sidebar, SidebarItem } from './Sidebar';

const mockItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <span>📊</span>, path: '/dashboard' },
  { id: 'vms', label: 'Virtual Machines', icon: <span>💻</span>, path: '/vms' },
  { id: 'settings', label: 'Settings', icon: <span>⚙️</span>, path: '/settings' },
];

const mockLogo = <div data-testid="logo">Logo</div>;

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

    it('does not render logo when not provided', () => {
      render(<Sidebar items={mockItems} />);
      expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
    });

    it('renders collapse button when collapsible is true', () => {
      render(<Sidebar items={mockItems} collapsible={true} />);
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    it('renders collapse button by default', () => {
      render(<Sidebar items={mockItems} />);
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    it('does not render collapse button when collapsible is false', () => {
      render(<Sidebar items={mockItems} collapsible={false} />);
      expect(screen.queryByLabelText('Collapse sidebar')).not.toBeInTheDocument();
    });
  });

  describe('8-bit Styling', () => {
    it('applies dark purple background', () => {
      const { container } = render(<Sidebar items={mockItems} />);
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('bg-neutral-darkPurple');
    });

    it('applies teal border', () => {
      const { container } = render(<Sidebar items={mockItems} />);
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('border-r-4');
      expect(sidebar).toHaveClass('border-neutral-teal');
    });

    it('applies pixel font to navigation items', () => {
      render(<Sidebar items={mockItems} />);
      const link = screen.getByText('Dashboard').closest('a');
      expect(link).toHaveClass('font-pixel');
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

    it('does not highlight inactive navigation items', () => {
      window.history.pushState({}, 'Dashboard', '/dashboard');
      render(<Sidebar items={mockItems} />);
      
      const inactiveLink = screen.getByText('Settings').closest('a');
      expect(inactiveLink).not.toHaveClass('bg-accent-cyan');
      expect(inactiveLink).toHaveClass('hover:bg-neutral-teal');
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
      const { container } = render(<Sidebar items={mockItems} />);
      const collapseButton = screen.getByLabelText('Collapse sidebar');
      
      await userEvent.click(collapseButton);
      
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-16');
      expect(sidebar).not.toHaveClass('w-64');
    });

    it('expands when expand button is clicked', async () => {
      const { container } = render(<Sidebar items={mockItems} />);
      const collapseButton = screen.getByLabelText('Collapse sidebar');
      
      // Collapse first
      await userEvent.click(collapseButton);
      
      // Then expand
      const expandButton = screen.getByLabelText('Expand sidebar');
      await userEvent.click(expandButton);
      
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('w-64');
    });

    it('hides logo when collapsed', async () => {
      render(<Sidebar items={mockItems} logo={mockLogo} />);
      const collapseButton = screen.getByLabelText('Collapse sidebar');
      
      await userEvent.click(collapseButton);
      
      const logoContainer = screen.getByTestId('logo').parentElement;
      expect(logoContainer).toHaveClass('hidden');
    });

    it('hides navigation labels when collapsed', async () => {
      render(<Sidebar items={mockItems} />);
      const collapseButton = screen.getByLabelText('Collapse sidebar');
      
      await userEvent.click(collapseButton);
      
      // Labels should not be visible (but icons should be)
      const dashboardLabel = screen.queryByText('Dashboard');
      expect(dashboardLabel).not.toBeVisible();
    });

    it('does not collapse when collapsible is false', async () => {
      const { container } = render(<Sidebar items={mockItems} collapsible={false} />);
      const sidebar = container.querySelector('aside');
      
      // Should remain expanded
      expect(sidebar).toHaveClass('w-64');
    });
  });

  describe('Navigation', () => {
    it('renders navigation items as links', () => {
      render(<Sidebar items={mockItems} />);
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      
      const vmsLink = screen.getByText('Virtual Machines').closest('a');
      expect(vmsLink).toHaveAttribute('href', '/vms');
    });

    it('renders icons for each navigation item', () => {
      render(<Sidebar items={mockItems} />);
      
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('💻')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic nav element', () => {
      const { container } = render(<Sidebar items={mockItems} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('collapse button has aria-label', () => {
      render(<Sidebar items={mockItems} />);
      const button = screen.getByLabelText('Collapse sidebar');
      expect(button).toHaveAttribute('aria-label');
    });

    it('updates aria-label when collapsed state changes', async () => {
      render(<Sidebar items={mockItems} />);
      
      const collapseButton = screen.getByLabelText('Collapse sidebar');
      await userEvent.click(collapseButton);
      
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });
  });
});
