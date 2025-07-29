'use client';

import React from 'react';
import { 
  calculatePasswordStrength, 
  getStrengthDescription, 
  getStrengthColor
} from '../../lib/security/passwordValidation';

interface PasswordStrengthMeterProps {
  password: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * PasswordStrengthMeter - Visual feedback for password strength
 * Non-intrusive, helpful guidance without blocking user flow
 */
export function PasswordStrengthMeter({ 
  password, 
  showDetails = true, 
  className = '' 
}: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password);

  // Don't show anything for empty password
  if (!password) {
    return null;
  }

  return (
    <div className={`mt-2 ${className}`}>
      {/* Strength Bar */}
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${(strength.score / 4) * 100}%`,
              backgroundColor: getStrengthColor(strength.score)
            }}
          />
        </div>
        <span 
          className="text-sm font-medium min-w-16"
          style={{ color: getStrengthColor(strength.score) }}
        >
          {getStrengthDescription(strength.score)}
        </span>
      </div>

      {/* Detailed Feedback */}
      {showDetails && (strength.feedback.length > 0 || strength.suggestions.length > 0) && (
        <div className="text-sm space-y-1">
          {/* Positive Feedback */}
          {strength.feedback.length > 0 && (
            <div className="text-green-600">
              {strength.feedback.map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className="mr-1">✓</span>
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {strength.suggestions.length > 0 && (
            <div className="text-gray-600">
              {strength.suggestions.map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className="mr-1">•</span>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PasswordRequirementsChecklist - Shows requirements in a friendly way
 */
interface PasswordRequirementsChecklistProps {
  password: string;
  className?: string;
}

export function PasswordRequirementsChecklist({ 
  password, 
  className = '' 
}: PasswordRequirementsChecklistProps) {
  const strength = calculatePasswordStrength(password);
  
  const requirements = [
    {
      met: password.length >= 8,
      text: 'At least 8 characters',
      icon: password.length >= 8 ? '✓' : '○'
    },
    {
      met: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      text: 'Contains a number or symbol',
      icon: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'
    },
    {
      met: strength.isValid,
      text: 'Not a common password',
      icon: strength.isValid ? '✓' : '○'
    }
  ];

  return (
    <div className={`mt-2 ${className}`}>
      <div className="text-sm text-gray-600 mb-2">Password requirements:</div>
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div 
            key={index}
            className={`flex items-center text-sm ${
              req.met ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            <span className="mr-2 font-mono">{req.icon}</span>
            {req.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook for using password strength in forms
 */
export function usePasswordStrength(password: string) {
  const strength = React.useMemo(() => {
    return calculatePasswordStrength(password);
  }, [password]);

  return {
    strength,
    isValid: strength.isValid,
    score: strength.score,
    description: getStrengthDescription(strength.score),
    color: getStrengthColor(strength.score)
  };
}