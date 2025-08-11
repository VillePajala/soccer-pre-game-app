# Contributing to This Project

Thank you for your interest in contributing.

By submitting a pull request or any contribution to this repository, you agree to the following terms:

1. You affirm that the contribution is your original work and that you have the right to submit it.
2. You grant Ville Pajala an irrevocable, worldwide, royalty-free license to use, modify, distribute, and sublicense the contribution.
3. You understand and agree that all intellectual property rights to your contribution will be transferred to Ville Pajala upon submission.
4. If requested, you agree to complete any additional documentation required to formalize this transfer of rights.

If you do not agree with these terms, do not submit a contribution.

– Ville Pajala

## Development Guidelines

- Run `npm run lint` and `npm test` before pushing.
- Follow the UI patterns in `docs/project/STYLE_GUIDE.md`.
- For docs, prefer relative links and update the "Last Updated" header.

## Commit Message Conventions

Format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert, migrate, security, i18n, a11y

Scopes (examples): homepage, components, hooks, utils, types, storage, i18n, pwa, game, roster, stats, modal, field, timer, settings

Rules:
- Imperative mood, max 50 chars subject, capitalize first letter, no trailing period

Examples:

```
feat(roster): add player assessment modal with rating system

- Implement PlayerAssessmentModal with 5-star ratings
- Persist assessments to storage
- Show assessment indicators in roster
```

