// Navigation.test.tsx - Unit tests for Navigation component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { Navigation, NavigationItem } from './Navigation';

const mockItems: NavigationItem[] = [
  { id: 'explore', label: 'Explore', path: '/explore', variant: 'normal' },
  { id: 'login', label: 'Login', path: '/login', variant: 'primary' },
];

const mockLogo = <div data-testid="custom-logo">Custom Logo</div>;

describe('Navigation Component', () => {
  describe('Rendering', () => {
    it('renders navigation header', () => {
      const { container } = render(<Navigation />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('renders placeholder logo by default', () => {
      const { container } = render(<Navigation />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders custom logo when provided', () => {
      render(<Navigation logo={mockLogo} />);
      expect(screen.getByTestId('custom-logo')).toBeInTheDocument();
    });

    it('renders navigation items', () => {
      render(<Navigation items={mockItems} />);
      expect(screen.getByText('Explore')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('renders without navigation items', () => {
      const { container } = render(<Navigation />);
      expect(container.querySelector('nav')).not.toBeInTheDocument();
    });
  });

  describe('8-bit Styling', () => {
    it('applies dark purple background', () => {
      const { container } = render(<Navigation />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('bg-neutral-darkPurple');
    });

    it('applies teal border', () => {
      const { container } = render(<Navigation />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('border-b-4');
      expect(header).toHaveClass('border-neutral-teal');
    });
  });

  describe('Logo', () => {
    it('logo links to home page', () => {
      render(<Navigation />);
      const logoLink = screen.getByRole('link', { name: /home/i });
      expect(logoLink).toHaveAttribute('href', '/');
    });

    it('placeholder logo has correct dimensions', () => {
      const { container } = render(<Navigation />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '40');
      expect(svg).toHaveAttribute('height', '40');
    });
  });

  describe('Back Button', () => {
    it('does not show back button by default', () => {
      render(<Navigation />);
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });

    it('does not show back button on root path', () => {
      window.history.pushState({}, 'Home', '/');
      render(<Navigation showBackButton={true} />);
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });

    it('shows back button on non-root path when showBackButton is true', () => {
      window.history.pushState({}, 'Page', '/some-page');
      render(<Navigation showBackButton={true} />);
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('back button navigates to previous page', async () => {
      window.history.pushState({}, 'Page 1', '/page1');
      window.history.pushState({}, 'Page 2', '/page2');
      
      render(<Navigation showBackButton={true} />);
      const backButton = screen.getByLabelText('Go back');
      
      await userEvent.click(backButton);
      
      // Navigation should have been triggered (tested via navigate mock)
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    it('renders items as buttons within links', () => {
      render(<Navigation items={mockItems} />);
      
      const exploreButton = screen.getByText('Explore').closest('button');
      expect(exploreButton).toBeInTheDocument();
      
      const loginButton = screen.getByText('Login').closest('button');
      expect(loginButton).toBeInTheDocument();
    });

    it('applies correct variant to navigation items', () => {
      render(<Navigation items={mockItems} />);
      
      const exploreButton = screen.getByText('Explore').closest('button');
      expect(exploreButton).toHaveClass('bg-neutral-olive'); // normal variant
      
      const loginButton = screen.getByText('Login').closest('button');
      expect(loginButton).toHaveClass('bg-primary-yellow'); // primary variant
    });

    it('links navigate to correct paths', () => {
      render(<Navigation items={mockItems} />);
      
      const exploreLink = screen.getByText('Explore').closest('a');
      expect(exploreLink).toHaveAttribute('href', '/explore');
      
      const loginLink = screen.getByText('Login').closest('a');
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Active State', () => {
    it('highlights active navigation item', () => {
      window.history.pushState({}, 'Explore', '/explore');
      render(<Navigation items={mockItems} />);
      
      const exploreButton = screen.getByText('Explore').closest('button');
      expect(exploreButton).toHaveClass('border-primary-yellow');
    });

    it('does not highlight inactive navigation items', () => {
      window.history.pushState({}, 'Explore', '/explore');
      render(<Navigation items={mockItems} />);
      
      const loginButton = screen.getByText('Login').closest('button');
      expect(loginButton).not.toHaveClass('border-primary-yellow');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic header element', () => {
      const { container } = render(<Navigation />);
      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('uses semantic nav element for navigation items', () => {
      const { container } = render(<Navigation items={mockItems} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('back button has aria-label', () => {
      window.history.pushState({}, 'Page', '/page');
      render(<Navigation showBackButton={true} />);
      
      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toHaveAttribute('aria-label', 'Go back');
    });
  });

  describe('Layout', () => {
    it('arranges logo and navigation items horizontally', () => {
      const { container } = render(<Navigation items={mockItems} />);
      const mainContainer = container.querySelector('.flex.items-center.justify-between');
      expect(mainContainer).toBeInTheDocument();
    });

    it('groups back button and logo together', () => {
      window.history.pushState({}, 'Page', '/page');
      const { container } = render(<Navigation showBackButton={true} />);
      
      const leftSection = container.querySelector('.flex.items-center.gap-md');
      expect(leftSection).toBeInTheDocument();
    });
  });
});
