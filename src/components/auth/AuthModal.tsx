'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { validatePassword } from '../../lib/security/passwordValidation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp, resetPassword } = useAuth();

  // Handle viewport height changes for mobile keyboard
  useEffect(() => {
    if (!isOpen) return;

    // Set CSS custom property for viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial vh
    setVH();

    // Update vh on resize (keyboard show/hide)
    const handleResize = () => {
      setVH();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.documentElement.style.removeProperty('--vh');
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Client-side password validation for signup
    if (mode === 'signup') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.error || 'Password does not meet requirements');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signin') {
        const { error, rateLimited, retryAfter, progressiveDelay } = await signIn(email, password);
        if (error) {
          if (rateLimited) {
            setError(`Too many attempts. Please try again in ${retryAfter} seconds.`);
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Signed in successfully!');
          onClose();
        }
        
        // Show progressive delay if present
        if (progressiveDelay && progressiveDelay > 0) {
          setMessage(`Please wait ${Math.ceil(progressiveDelay / 1000)} seconds before next attempt.`);
        }
      } else if (mode === 'signup') {
        const { error, rateLimited, retryAfter } = await signUp(email, password);
        if (error) {
          if (rateLimited) {
            setError(`Too many signup attempts. Please try again in ${retryAfter} seconds.`);
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Check your email for verification link!');
        }
      } else if (mode === 'reset') {
        const { error, rateLimited, retryAfter } = await resetPassword(email);
        if (error) {
          if (rateLimited) {
            setError(`Too many reset attempts. Please try again in ${retryAfter} seconds.`);
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Password reset link sent to your email!');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setMessage(null);
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  // Handle input focus to ensure visibility on mobile
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Small delay to allow keyboard to appear
    setTimeout(() => {
      e.target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[100] p-4 pt-8 pb-4 overflow-y-auto"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md my-auto min-h-fit shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Sign Up'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleInputFocus}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handleInputFocus}
                required
                minLength={mode === 'signup' ? 8 : 6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={mode === 'signup' ? 'At least 8 characters with a number or symbol' : 'Enter your password'}
              />
              
              {/* Show password strength meter for signup */}
              {mode === 'signup' && password && (
                <PasswordStrengthMeter 
                  password={password}
                  showDetails={true}
                  className="mt-2"
                />
              )}
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600 space-y-2">
          {mode === 'signin' && (
            <>
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-blue-600 hover:underline"
                >
                  Sign up
                </button>
              </p>
              <p>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'reset' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}