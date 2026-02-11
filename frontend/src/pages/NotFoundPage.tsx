// NotFoundPage.tsx - 8-bit styled 404 page
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button/Button';
import { Container } from '../components/Container/Container';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-darkPurple via-accent-pink to-primary-yellow flex items-center justify-center p-4">
      <Container variant="dark" padding="lg" className="max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="font-pixel text-6xl text-accent-cyan mb-4">404</h1>
          <h2 className="font-pixel text-2xl text-white mb-6">Page Not Found</h2>
          <div className="inline-block border-4 border-accent-pink p-4 mb-6">
            <div className="font-pixel text-sm text-white">
              <div className="mb-2">╔══════════════════════════════════════╗</div>
              <div className="mb-2">║  ERROR: PAGE NOT FOUND              ║</div>
              <div className="mb-2">║                                     ║</div>
              <div className="mb-2">║  The requested resource could not   ║</div>
              <div className="mb-2">║  be located in the system memory.   ║</div>
              <div className="mb-2">║                                     ║</div>
              <div className="mb-2">║  Possible causes:                   ║</div>
              <div className="mb-2">║  • Invalid URL                      ║</div>
              <div className="mb-2">║  • Page moved or deleted            ║</div>
              <div className="mb-2">║  • Typo in address                  ║</div>
              <div className="mb-2">║                                     ║</div>
              <div className="mb-2">╚══════════════════════════════════════╝</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button variant="primary" className="px-8 py-3">
              Return to Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="normal" className="px-8 py-3">
              Go to Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="mt-8">
          <p className="font-pixel text-sm text-neutral-teal">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </Container>
    </div>
  );
};

export default NotFoundPage;