import React from 'react';
import { usePuterStore } from '../../lib/puter';

const PuterAuthModal = () => {
  const { isLoading, auth, error } = usePuterStore();

  return (
    <div className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-[70vh] flex items-center justify-center p-4">
      <div className="gradient-border shadow-xl max-w-lg w-full">
        <section className="flex flex-col gap-6 bg-white rounded-2xl p-8 text-center items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
            🤖
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900">AI Resume Analysis</h1>
            <p className="text-gray-600">
              Connect your Puter account to enable instant AI-powered resume scoring, ATS matching, and detailed improvement tips.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg w-full">
              {error}
            </div>
          )}

          <div className="w-full mt-2">
            {isLoading ? (
              <button disabled className="auth-button animate-pulse opacity-70">
                <p>Checking authentication...</p>
              </button>
            ) : (
              <button onClick={() => auth.signIn()} className="primary-button text-lg font-semibold py-3">
                Connect Puter Account
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Puter storage & AI is used exclusively for practice resume analysis.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PuterAuthModal;
