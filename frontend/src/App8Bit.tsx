// App8Bit.tsx - 8-bit redesigned application
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { VMCreatePage } from './pages/VMCreatePage';
import './App.css';

function App8Bit() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="app">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/explore" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vms" element={<Dashboard />} />
            <Route path="/vms/create" element={<VMCreatePage />} />
            <Route path="/writeups" element={<Dashboard />} />
            <Route path="/settings" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App8Bit;
