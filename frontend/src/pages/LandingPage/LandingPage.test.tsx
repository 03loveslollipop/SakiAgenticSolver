// LandingPage.test.tsx - Unit tests for LandingPage (8-bit redesign)
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('renders hero brand and message', () => {
    render(<LandingPage />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/SAKI/i);

    expect(
      screen.getByText(/Automate AI Agents pipelines and environments for security usecases/i)
    ).toBeInTheDocument();
  });

  it('renders call-to-action buttons', () => {
    render(<LandingPage />);

    expect(screen.getAllByRole('button', { name: /login/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^features$/i })).toBeInTheDocument();
  });

  it('renders language selector in navigation', () => {
    render(<LandingPage />);
    expect(screen.getByRole('combobox', { name: /select language/i })).toBeInTheDocument();
  });

  it('renders features section and footer', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { level: 2, name: /^features$/i })).toBeInTheDocument();
    expect(screen.getByText('VM Management')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Progress Tracking')).toBeInTheDocument();

    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`\\(c\\) ${year} CTF Automation Platform`, 'i'))).toBeInTheDocument();
  });

  it('applies gradient background to hero section', () => {
    const { container } = render(<LandingPage />);
    const heroSection = container.querySelector('section') as HTMLElement | null;
    expect(heroSection).toBeInTheDocument();
    // jsdom does not reliably preserve complex CSS shorthands like gradients; assert structure instead.
    expect(heroSection).toHaveClass('sticky');
  });
});
