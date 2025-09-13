import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">404</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Page not found</p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">The page you are looking for doesn’t exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/dashboard" className="btn-primary">Go back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;


