// Loading.test.tsx - Unit tests for Loading component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import { Loading } from './Loading';

describe('Loading Component', () => {
  describe('Rendering', () => {
    it('renders loading spinner', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin-pixel');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with default text', () => {
      render(<Loading />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      render(<Loading text="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders without text when text prop is empty string', () => {
      render(<Loading text="" />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders with medium size by default', () => {
      const { container } = render(<Loading />);
      const spinnerContainer = container.querySelector('.w-8');
      expect(spinnerContainer).toBeInTheDocument();
      expect(spinnerContainer).toHaveClass('h-8');
    });

    it('renders with small size', () => {
      const { container } = render(<Loading size="sm" />);
      const spinnerContainer = container.querySelector('.w-4');
      expect(spinnerContainer).toBeInTheDocument();
      expect(spinnerContainer).toHaveClass('h-4');
    });

    it('renders with large size', () => {
      const { container } = render(<Loading size="lg" />);
      const spinnerContainer = container.querySelector('.w-12');
      expect(spinnerContainer).toBeInTheDocument();
      expect(spinnerContainer).toHaveClass('h-12');
    });
  });

  describe('8-bit Styling', () => {
    it('applies pixel font to text', () => {
      render(<Loading text="Loading..." />);
      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('font-pixel');
    });

    it('applies 8-bit animation', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin-pixel');
      expect(spinner).toBeInTheDocument();
    });

    it('applies primary yellow border to spinner', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.border-primary-yellow');
      expect(spinner).toBeInTheDocument();
    });

    it('applies 4px border to spinner', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.border-4');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('arranges spinner and text in column', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex-col');
    });

    it('applies gap between spinner and text', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('gap-md');
    });
  });
});
