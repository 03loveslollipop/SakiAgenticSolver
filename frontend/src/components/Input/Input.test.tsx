// Input.test.tsx - Unit tests for Input component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your username" />);
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input error="This field is required" />);
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('This field is required');
    });

    it('does not show helper text when error is present', () => {
      render(<Input helperText="Helper text" error="Error message" />);
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('8-bit Styling', () => {
    it('applies pixel font class', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('font-pixel');
    });

    it('applies 4px border', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-4');
      expect(input).toHaveClass('border-solid');
    });

    it('applies teal border by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-neutral-teal');
    });

    it('applies pink border when error is present', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-accent-pink');
    });
  });

  describe('Accessibility', () => {
    it('associates label with input using htmlFor/id', () => {
      render(<Input label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      const input = screen.getByLabelText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('generates unique id when not provided', () => {
      const { container } = render(<Input label="Field 1" />);
      const input1 = container.querySelector('input');
      
      const { container: container2 } = render(<Input label="Field 2" />);
      const input2 = container2.querySelector('input');
      
      expect(input1?.id).toBeTruthy();
      expect(input2?.id).toBeTruthy();
      expect(input1?.id).not.toBe(input2?.id);
    });

    it('error message has role="alert"', () => {
      render(<Input error="Error message" />);
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('forwards standard input props', () => {
      render(<Input type="email" placeholder="Enter email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
    });

    it('applies custom className to wrapper', () => {
      const { container } = render(<Input className="custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('handles disabled state', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Interactions', () => {
    it('accepts user input', async () => {
      render(<Input />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      
      await userEvent.type(input, 'test value');
      expect(input.value).toBe('test value');
    });

    it('calls onChange handler', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'a');
      expect(handleChange).toHaveBeenCalled();
    });

    it('is keyboard accessible', async () => {
      render(<Input label="Test Input" />);
      const input = screen.getByRole('textbox');
      
      await userEvent.tab();
      expect(input).toHaveFocus();
    });
  });
});
