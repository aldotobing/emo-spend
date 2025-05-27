'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          We're sorry, but an unexpected error occurred. Our team has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-center"
          >
            Go to home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer mb-2">
              Error details (only visible in development)
            </summary>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && (
                <>
                  <br />
                  <br />
                  {error.stack}
                </>
              )}
              {error.digest && (
                <>
                  <br />
                  <br />
                  Digest: {error.digest}
                </>
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
