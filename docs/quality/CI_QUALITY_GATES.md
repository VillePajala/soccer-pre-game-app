# CI Quality Gates and Local Validation

Last updated: 2025-08-11

This document describes the automated quality gates enforced by CI and how to run them locally.

## Overview

CI runs on pushes and pull requests and enforces:

- Test pass with coverage thresholds
- Bundle size budgets
- Build succeeds with analyzer enabled
- Accessibility (a11y) checks in unit tests

Workflow file: `.github/workflows/ci.yml`

## Coverage thresholds

Configured in `jest.config.js` (global):

- branches: 32%
- functions: 36%
- lines: 38%
- statements: 38%

CI command (collects coverage and enforces thresholds):

```
npm run test:ci
```

Artifacts: Jest coverage output under `coverage/`.

## Bundle size budgets

Budgets enforced after a production build with analyzer enabled:

- Main bundle max: 1 MB
- Total assets max: 5 MB

Implementation:

- Build with analyzer: `ANALYZE=true npm run build`
- Budget check script: `scripts/check-bundle-budgets.mjs`
- CI step: `npm run ci:bundle-budgets`

Run locally:

```
ANALYZE=true npm run build
npm run ci:bundle-budgets
```

## Accessibility checks (jest-axe)

Accessibility is validated in unit tests using `jest-axe`:

- Setup file: `src/setupAccessibilityTests.ts` (registered via `setupFilesAfterEnv` in `jest.config.js`)
- Global helpers:
  - `testAccessibility(container)`
  - `testModalAccessibility(container)`

Example usage in a modal test:

```ts
const { container } = render(<MyModal isOpen />);
await (global as any).testModalAccessibility(container);
```

## What CI does

1. Lint: `npm run lint`
2. Tests with coverage: `npm run test:ci`
3. Build with analyzer: `ANALYZE=true npm run build`
4. Enforce bundle budgets: `npm run ci:bundle-budgets`

If any step fails, the workflow fails. Protect the main branch to block merges on failing checks.


