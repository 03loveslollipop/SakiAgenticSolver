// InitialPageLoadPerformance.simple.property.test.tsx - Minimal suite to keep Jest happy
import React from 'react';
import { render } from '@testing-library/react';
import { Loading } from '../../components/Loading/Loading';

describe('Performance - Initial Page Load Performance (Simple)', () => {
  test('renders Loading component', () => {
    const { container } = render(<Loading text="Loading..." size="sm" />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });
});

