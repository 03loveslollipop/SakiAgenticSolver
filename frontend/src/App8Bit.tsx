// App8Bit.tsx - 8-bit redesigned application
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loading } from './components/Loading/Loading';
import PrivateRoute8Bit from './components/PrivateRoute8Bit';
import PublicRoute8Bit from './components/PublicRoute8Bit';
import AdminRoute from './components/AdminRoute';
import GlobalLoadingIndicator from './components/GlobalLoadingIndicator';
import './App.css';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const VMCreatePage = lazy(() => import('./pages/VMCreatePage').then((module) => ({ default: module.VMCreatePage })));
const WriteupsPage = lazy(() => import('./pages/WriteupsPage').then((module) => ({ default: module.WriteupsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const SessionDetail = lazy(() => import('./components/SessionDetail'));
const WriteupDetail = lazy(() => import('./components/WriteupDetail'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const FullscreenRouteLoader = () => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-darkPurple/70 backdrop-blur-sm">
      <div className="border-4 border-accent-cyan bg-neutral-darkPurple p-lg shadow-pixel-lg">
        <Loading size="lg" text={t('app.loadingPage')} />
      </div>
    </div>
  );
};

function App8Bit() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <ErrorProvider>
          <ThemeProvider>
            <Router>
              <ErrorBoundary>
                <div className="app">
                  <Suspense fallback={<FullscreenRouteLoader />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/explore" element={<LandingPage />} />
                      <Route 
                        path="/login" 
                        element={
                          <PublicRoute8Bit>
                            <AuthPage />
                          </PublicRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/signup" 
                        element={
                          <PublicRoute8Bit>
                            <AuthPage />
                          </PublicRoute8Bit>
                        } 
                      />
                      
                      {/* Protected routes */}
                      <Route 
                        path="/dashboard" 
                        element={
                          <PrivateRoute8Bit>
                            <Dashboard />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/vms" 
                        element={
                          <PrivateRoute8Bit>
                            <Dashboard />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/vms/create" 
                        element={
                          <PrivateRoute8Bit>
                            <VMCreatePage />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/writeups" 
                        element={
                          <PrivateRoute8Bit>
                            <WriteupsPage />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/writeups/:sessionId" 
                        element={
                          <PrivateRoute8Bit>
                            <WriteupDetail />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/sessions/:sessionId" 
                        element={
                          <PrivateRoute8Bit>
                            <SessionDetail />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <PrivateRoute8Bit>
                            <SettingsPage />
                          </PrivateRoute8Bit>
                        } 
                      />
                      <Route
                        path="/users"
                        element={
                          <AdminRoute>
                            <UserManagement />
                          </AdminRoute>
                        }
                      />
                      
                      {/* 404 page */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    <GlobalLoadingIndicator />
                  </Suspense>
                </div>
              </ErrorBoundary>
            </Router>
          </ThemeProvider>
        </ErrorProvider>
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App8Bit;
