import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import PublicRoute from './components/PublicRoute';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Dashboard from './components/Dashboard';
import VMCreationForm from './components/VMCreationForm';
import SessionDetail from './components/SessionDetail';
import WriteupsBrowser from './components/WriteupsBrowser';
import WriteupDetail from './components/WriteupDetail';
import UserManagement from './components/UserManagement';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/create"
              element={
                <PrivateRoute>
                  <VMCreationForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/sessions/:sessionId"
              element={
                <PrivateRoute>
                  <SessionDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/writeups"
              element={
                <PrivateRoute>
                  <WriteupsBrowser />
                </PrivateRoute>
              }
            />
            <Route
              path="/writeups/:sessionId"
              element={
                <PrivateRoute>
                  <WriteupDetail />
                </PrivateRoute>
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
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
