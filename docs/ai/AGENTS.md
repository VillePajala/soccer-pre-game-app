# AGENTS Instructions

This repository uses Node.js 20, Next.js 15 and React 19 with TypeScript. Follow these guidelines when using Codex with this code base.

## Required Commands
- After modifying code, always run `npm run lint` and `npm test`.
- Fix any reported issues before committing.
- If you touch translation files in `public/locales/`, run `npm run generate:i18n-types` before committing.

## Code Style
- Place React components inside `src/` and co-locate tests using the `.test.tsx` or `.test.ts` suffix.
- Follow the UI conventions in `../project/STYLE_GUIDE.md`.
- Use two space indentation and semicolons like the existing code.

## Pull Requests
- Use the [pull request template](../../.github/pull_request_template.md) when creating PRs
- The PR description should summarize the changes and mention the results of `npm run lint` and `npm test`.
- Include references to relevant documentation or code lines when explaining changes.

For more context on project architecture and commands see `CLAUDE.md` and `README.md`.
Consult the [Manual Testing Guide](../testing/MANUAL_TESTING_GUIDE.md) for a checklist of key workflows to verify after updates.
