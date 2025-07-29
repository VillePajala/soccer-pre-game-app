/**
 * Reasonable Password Validation
 * 
 * Focuses on usability while providing basic security improvements.
 * Avoids overly strict rules that frustrate users.
 */

export interface PasswordStrength {
  score: number; // 0-4 (0=very weak, 4=very strong)
  feedback: string[];
  suggestions: string[];
  isValid: boolean;
}

export interface PasswordRequirements {
  minLength: boolean;
  hasNumberOrSymbol: boolean;
  notCommon: boolean;
}

// Common passwords to avoid (small list of obvious ones)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'shadow', 'football', 'baseball',
  'soccer', 'coach', 'team', 'player', 'game'
]);

/**
 * Check if password meets our reasonable requirements
 */
export function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasNumberOrSymbol: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    notCommon: !COMMON_PASSWORDS.has(password.toLowerCase())
  };
}

/**
 * Calculate password strength (0-4 scale)
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      feedback: [],
      suggestions: ['Enter a password'],
      isValid: false
    };
  }

  const requirements = checkPasswordRequirements(password);
  const feedback: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length scoring
  if (password.length >= 8) {
    score += 1;
  } else {
    suggestions.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
    feedback.push('Good length');
  }

  // Character variety scoring
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  let varietyScore = 0;
  if (hasLower) varietyScore++;
  if (hasUpper) varietyScore++;
  if (hasNumber) varietyScore++;
  if (hasSymbol) varietyScore++;

  if (varietyScore >= 2) {
    score += 1;
    if (varietyScore >= 3) {
      score += 1;
      feedback.push('Good character variety');
    }
  }

  // Check for common passwords
  if (!requirements.notCommon) {
    suggestions.push('Avoid common passwords');
    score = Math.max(0, score - 1);
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Avoid repeating characters');
    score = Math.max(0, score - 1);
  }

  // Basic requirements check
  if (!requirements.hasNumberOrSymbol) {
    suggestions.push('Add a number or symbol');
  }

  // Generate helpful feedback
  if (score >= 3) {
    feedback.push('Strong password');
  } else if (score >= 2) {
    feedback.push('Good password');
  } else if (score >= 1) {
    feedback.push('Fair password');
  }

  // Final validation
  const isValid = requirements.minLength && requirements.hasNumberOrSymbol && requirements.notCommon;

  return {
    score: Math.min(4, score),
    feedback,
    suggestions,
    isValid
  };
}

/**
 * Get user-friendly description of password strength
 */
export function getStrengthDescription(score: number): string {
  switch (score) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

/**
 * Get color for password strength indicator
 */
export function getStrengthColor(score: number): string {
  switch (score) {
    case 0:
      return '#ef4444'; // red-500
    case 1:
      return '#f97316'; // orange-500
    case 2:
      return '#eab308'; // yellow-500
    case 3:
      return '#22c55e'; // green-500
    case 4:
      return '#16a34a'; // green-600
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Validate password with user-friendly error messages
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  const requirements = checkPasswordRequirements(password);

  if (!requirements.minLength) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!requirements.hasNumberOrSymbol) {
    return { isValid: false, error: 'Password must contain at least one number or symbol' };
  }

  if (!requirements.notCommon) {
    return { isValid: false, error: 'Please choose a less common password' };
  }

  return { isValid: true };
}