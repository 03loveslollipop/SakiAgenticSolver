// validation.ts - Form validation utilities
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateForm = (
  values: Record<string, any>,
  rules: Record<string, (value: any) => string | null>
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const error = rule(values[field]);
    if (error) {
      errors.push({ field, message: error });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Common validation rules
export const validationRules = {
  required: (value: any): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value: string): string | null => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  minLength: (min: number) => (value: string): string | null => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string): string | null => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },
  
  pattern: (regex: RegExp, message: string) => (value: string): string | null => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },
};
