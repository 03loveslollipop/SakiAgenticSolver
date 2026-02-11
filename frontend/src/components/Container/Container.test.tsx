// Container.test.tsx - Unit tests for Container component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import { Container } from './Container';

describe('Container Component', () => {
  describe('Rendering', () => {
    it('renders children content', () => {
      render(<Container>Test Content</Container>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders with light variant by default', () => {
      const { container } = render(<Container>Light Container</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('bg-white');
      expect(div).toHaveClass('border-neutral-olive');
    });

    it('renders with dark variant', () => {
      const { container } = render(<Container variant="dark">Dark Container</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('bg-neutral-darkPurple');
      expect(div).toHaveClass('border-neutral-teal');
      expect(div).toHaveClass('text-white');
    });
  });

  describe('8-bit Styling', () => {
    it('applies pixelated border', () => {
      const { container } = render(<Container>Bordered Container</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('border-4');
      expect(div).toHaveClass('border-solid');
    });
  });

  describe('Padding', () => {
    it('applies medium padding by default', () => {
      const { container } = render(<Container>Default Padding</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('p-md');
    });

    it('applies small padding', () => {
      const { container } = render(<Container padding="sm">Small Padding</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('p-sm');
    });

    it('applies large padding', () => {
      const { container } = render(<Container padding="lg">Large Padding</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('p-lg');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<Container className="custom-class">Custom Container</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('custom-class');
    });

    it('preserves base classes when custom className is provided', () => {
      const { container } = render(<Container className="custom-class">Custom Container</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('border-4');
      expect(div).toHaveClass('border-solid');
      expect(div).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('light variant has white background', () => {
      const { container } = render(<Container variant="light">Light</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('bg-white');
    });

    it('dark variant has dark purple background', () => {
      const { container } = render(<Container variant="dark">Dark</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('bg-neutral-darkPurple');
    });

    it('dark variant has white text', () => {
      const { container } = render(<Container variant="dark">Dark</Container>);
      const div = container.firstChild as HTMLElement;
      expect(div).toHaveClass('text-white');
    });
  });
});
