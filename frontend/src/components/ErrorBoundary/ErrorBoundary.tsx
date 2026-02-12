// ErrorBoundary.tsx - React error boundary component with 8-bit styling
import React, { Component, ReactNode } from 'react';
import { Container } from '../Container';
import { Button } from '../Button';
import i18n from '../../config/i18n';

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
        <Container 
          variant="dark" 
          padding="lg" 
          className="text-center" 
          role="alert"
          aria-live="assertive"
          aria-label={i18n.t('errors.boundary.ariaLabel')}
        >
          <h2 className="font-pixel text-lg text-accent-pink mb-md">
            {i18n.t('errors.boundary.title')}
          </h2>
          <p className="font-pixel text-sm mb-lg">
            {this.state.error?.message || i18n.t('errors.boundary.defaultMessage')}
          </p>
          <Button variant="primary" onClick={this.handleReset} aria-label={i18n.t('common.retry')}>
            {i18n.t('common.retry')}
          </Button>
        </Container>
      );
    }
    
    return this.props.children;
  }
}
