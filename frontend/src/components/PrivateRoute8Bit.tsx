// PrivateRoute8Bit.tsx - 8-bit styled private route component
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './Loading/Loading';

interface PrivateRoute8BitProps {
  children: React.ReactElement;
}

const PrivateRoute8Bit: React.FC<PrivateRoute8BitProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-darkPurple">
        <Loading text="Checking authentication..." />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute8Bit;