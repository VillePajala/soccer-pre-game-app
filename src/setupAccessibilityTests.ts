/**
 * Accessibility Testing Setup
 * 
 * This file configures jest-axe for automated accessibility testing
 * across all modal components and interactions.
 */

import { configureAxe, toHaveNoViolations } from 'jest-axe';

// Configure axe-core for our specific testing needs
const axe = configureAxe({
  // Use standard rule set filtered by tags; avoid specifying non-existent rule IDs
  rules: {
    // Focus on WCAG 2.1 AA compliance
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
  }
});

// Extend Jest matchers with accessibility assertions
expect.extend(toHaveNoViolations);

// Global accessibility test helper
global.testAccessibility = async (container: Element) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Modal-specific accessibility testing helper
global.testModalAccessibility = async (container: Element) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Add types for global helpers
declare global {
  function testAccessibility(container: Element): Promise<void>;
  function testModalAccessibility(container: Element): Promise<void>;
}

export { axe, toHaveNoViolations };