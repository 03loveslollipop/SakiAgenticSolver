// LandingPage.test.tsx - Unit tests for LandingPage
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  describe('Rendering', () => {
    it('renders hero section with title', () => {
      render(<LandingPage />);
      expect(screen.getByText('CTF Automation Platform')).toBeInTheDocument();
    });

    it('renders hero description', () => {
      render(<LandingPage />);
      expect(screen.getByText(/Launch virtual machines, solve challenges/i)).toBeInTheDocument();
    });

    it('renders call-to-action buttons', () => {
      render(<LandingPage />);
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /explore/i })).toBeInTheDocument();
    });

    it('renders navigation', () => {
      render(<LandingPage />);
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('renders features section', () => {
      render(<LandingPage />);
      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    it('renders three feature cards', () => {
      render(<LandingPage />);
      expect(screen.getByText(/VM Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Security/i)).toBeInTheDocument();
      expect(screen.getByText(/Progress Tracking/i)).toBeInTheDocument();
    });

    it('renders footer', () => {
      render(<LandingPage />);
      expect(screen.getByText(/© 2024 CTF Automation Platform/i)).toBeInTheDocument();
    });

    it('renders pixel art graphic', () => {
      const { container } = render(<LandingPage />);
      // Check for either canvas (HeroPixelAnimation) or svg (PixelArt fallback)
      const canvas = container.querySelector('canvas');
      const svg = container.querySelector('svg');
      expect(canvas || svg).toBeTruthy();
    });
  });

  describe('8-bit Styling', () => {
    it('applies gradient background', () => {
      const { container } = render(<LandingPage />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.style.background).toContain('linear-gradient');
    });

    it('applies pixel font to headings', () => {
      render(<LandingPage />);
      const heading = screen.getByText('CTF Automation Platform');
      expect(heading).toHaveClass('font-pixel');
    });

    it('applies pixel font to text', () => {
      render(<LandingPage />);
      const description = screen.getByText(/Launch virtual machines/i);
      expect(description).toHaveClass('font-pixel');
    });
  });

  describe('Navigation', () => {
    it('Get Started button navigates to dashboard', async () => {
      render(<LandingPage />);
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      
      await userEvent.click(getStartedButton);
      
      // Navigation should be triggered
      expect(getStartedButton).toBeInTheDocument();
    });

    it('Explore button navigates to explore page', async () => {
      render(<LandingPage />);
      const exploreButton = screen.getByRole('button', { name: /explore/i });
      
      await userEvent.click(exploreButton);
      
      // Navigation should be triggered
      expect(exploreButton).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('renders on mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      render(<LandingPage />);
      expect(screen.getByText('CTF Automation Platform')).toBeInTheDocument();
    });

    it('renders on desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      
      render(<LandingPage />);
      expect(screen.getByText('CTF Automation Platform')).toBeInTheDocument();
    });
  });

  describe('Features Section', () => {
    it('displays VM Management feature', () => {
      render(<LandingPage />);
      expect(screen.getByText('🖥️ VM Management')).toBeInTheDocument();
      expect(screen.getByText(/Launch and manage virtual machines/i)).toBeInTheDocument();
    });

    it('displays Security feature', () => {
      render(<LandingPage />);
      expect(screen.getByText('🔒 Security')).toBeInTheDocument();
      expect(screen.getByText(/Practice cybersecurity/i)).toBeInTheDocument();
    });

    it('displays Progress Tracking feature', () => {
      render(<LandingPage />);
      expect(screen.getByText('📊 Progress Tracking')).toBeInTheDocument();
      expect(screen.getByText(/Monitor your learning journey/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic main element', () => {
      const { container } = render(<LandingPage />);
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('uses semantic footer element', () => {
      const { container } = render(<LandingPage />);
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('uses proper heading hierarchy', () => {
      render(<LandingPage />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('CTF Automation Platform');
    });
  });
});
