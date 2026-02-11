// PublicRoute8Bit.tsx - 8-bit styled public route component
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './Loading/Loading';

interface PublicRoute8BitProps {
  children: React.ReactElement;
}

const PublicRoute8Bit: React.FC<PublicRoute8BitProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-darkPurple">
        <Loading text="Checking authentication..." />
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export default PublicRoute8Bit;