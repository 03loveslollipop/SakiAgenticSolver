// render-with-providers.tsx - Custom render function with providers
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../theme';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { initialRoute = '/', ...renderOptions } = options || {};
  
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }
  
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

export * from '@testing-library/react';
export { customRender as render };
