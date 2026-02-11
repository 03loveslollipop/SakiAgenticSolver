// ErrorBoundary.tsx - React error boundary component with 8-bit styling
import React, { Component, ReactNode } from 'react';
import { Container } from '../Container';
import { Button } from '../Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <Container variant="dark" padding="lg" className="text-center">
          <h2 className="font-pixel text-lg text-accent-pink mb-md">
            Oops! Something went wrong
          </h2>
          <p className="font-pixel text-sm mb-lg">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button variant="primary" onClick={this.handleReset}>
            Try Again
          </Button>
        </Container>
      );
    }
    
    return this.props.children;
  }
}
