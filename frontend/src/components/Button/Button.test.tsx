// Button.test.tsx - Unit tests for Button component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with normal variant by default', () => {
      render(<Button>Normal Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-neutral-olive');
      expect(button).toHaveClass('border-neutral-teal');
    });

    it('renders with primary variant', () => {
      render(<Button variant="primary">Primary Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-yellow');
      expect(button).toHaveClass('border-accent-cyan');
    });

    it('renders with success variant', () => {
      render(<Button variant="success">Success Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-accent-cyan');
      expect(button).toHaveClass('border-neutral-teal');
    });

    it('renders with warning variant', () => {
      render(<Button variant="warning">Warning Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-yellow');
      expect(button).toHaveClass('border-neutral-olive');
    });

    it('renders with error variant', () => {
      render(<Button variant="error">Error Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-accent-pink');
      expect(button).toHaveClass('border-neutral-darkPurple');
    });
  });

  describe('8-bit Styling', () => {
    it('applies pixel font class', () => {
      render(<Button>Styled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('font-pixel');
    });

    it('applies 4px border', () => {
      render(<Button>Bordered Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-4');
      expect(button).toHaveClass('border-solid');
    });

    it('applies transition animations', () => {
      render(<Button>Animated Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all');
    });
  });

  describe('Props', () => {
    it('applies fullWidth class when fullWidth prop is true', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('does not apply fullWidth class when fullWidth prop is false', () => {
      render(<Button fullWidth={false}>Normal Width Button</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards additional props to button element', () => {
      render(<Button data-testid="test-button" aria-label="Test">Button</Button>);
      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('aria-label', 'Test');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });

    it('does not trigger onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      const button = screen.getByRole('button');
      
      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Clickable Button</Button>);
      const button = screen.getByRole('button');
      
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard Button</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      
      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
