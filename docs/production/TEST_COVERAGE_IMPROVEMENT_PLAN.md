## Test Coverage Improvement Plan (Release-Grade)

### Executive summary
- **Current**: ~36–40% lines/statements; permissive CI gates; solid unit breadth; light integration/E2E; masking flags in Jest.
- **Target (release-grade)**:
  - **Global**: 80% statements/lines/functions, 70% branches
  - **Per-scope minimums**:
    - `src/utils/`: 95% lines/statements/functions, 85% branches
    - `src/stores/`: 90% lines/functions, 80% branches
    - `src/hooks/`: 85% lines/functions, 75% branches
    - Core components (`HomePage`, `SoccerField`, `TimerOverlay`, `ControlBar`, `GameInfoBar`): 80% lines/functions, 70% branches per file
    - `src/app/**`: 75% lines/functions, 65% branches
  - **Quality gates**: 0 a11y violations, 100% pass for critical E2E journeys, no open-handle leaks, flake rate <2% on CI

### Why this matters
- Increases confidence to ship and iterate quickly
- Prevents regressions in core match workflows and data integrity
- Aligns with production readiness plan and GTM timelines

### Threshold configuration (final target)
```js
// jest.config.js
coverageThreshold: {
  global: { statements: 80, lines: 80, functions: 80, branches: 70 },
  "./src/utils/**/*.{ts,tsx}": { statements: 95, lines: 95, functions: 95, branches: 85 },
  "./src/stores/**/*.{ts,tsx}": { statements: 90, lines: 90, functions: 90, branches: 80 },
  "./src/hooks/**/*.{ts,tsx}": { statements: 85, lines: 85, functions: 85, branches: 75 },
  "./src/components/HomePage.tsx": { statements: 80, lines: 80, functions: 80, branches: 70 },
  "./src/components/SoccerField.tsx": { statements: 80, lines: 80, functions: 80, branches: 70 },
  "./src/components/TimerOverlay.tsx": { statements: 80, lines: 80, functions: 80, branches: 70 },
  "./src/components/ControlBar.tsx": { statements: 80, lines: 80, functions: 80, branches: 70 },
  "./src/components/GameInfoBar.tsx": { statements: 80, lines: 80, functions: 80, branches: 70 },
  "./src/app/**/*.{ts,tsx}": { statements: 75, lines: 75, functions: 75, branches: 65 }
}
```

### 4-week execution plan

#### Week 1 — Foundations and quick wins (goal: ~55–60% global)
- **Harden config**
  - Align docs and `jest.config.js` thresholds; enable `coverageReporters: ['text-summary','html','lcov']`; publish HTML and lcov (Codecov).
  - Remove `forceExit`; set `detectOpenHandles: true`; fix any leaks exposed.
  - Remove `--passWithNoTests` from CI command; keep `--maxWorkers=2` for stability.
- **Threshold ramp (step 1)**
  - Global: 55/55/55/45 (statements/lines/functions/branches)
  - Scope gates: `utils 85/85/85/75`, `stores 80/80/80/70`, `hooks 70/70/70/60`, core components 50/50/50/45, `src/app/**` 50/50/50/45
- **Coverage quick wins**
  - Top up `utils`, `stores`, `hooks` edge/error/branch paths to meet scope gates.
  - Add deterministic clock helpers for timer tests; migrate timer specs to fake timers.
- **Integration setup**
  - Add MSW; establish handlers for auth, save/load, sync, and failure scenarios.
  - Write 5–8 integration specs: email confirm/reset, save queue retry/backoff, load existing game, error banners.

#### Week 2 — Core UI and App Router (goal: ~65–70% global)
- **Core components**
  - `HomePage`: smoke render + key actions (start game, save, error handling).
  - `ControlBar`: pause/resume/reset branches; disabled states.
  - `TimerOverlay`: start/pause/resume; persistence across reload with fake timers.
  - `GameInfoBar`: score updates; team switch; edge inputs.
- **App Router pages**
  - `src/app/page.tsx`, `src/app/layout.tsx`: provider wiring, redirects/guards.
- **Threshold ramp (step 2)**
  - Global: 65/65/65/55; core component/file gates → 65/65/65/55; `src/app/**` → 60/60/60/50

#### Week 3 — Reliability integrations and E2E (goal: ~72–78% global)
- **Integration depth**
  - Storage sync: offline queue, retry/backoff, conflict resolution.
  - IndexedDB fallback and error recovery; autosave events (success/failure).
  - Import/export roundtrip validity.
- **Playwright E2E (CI)**
  - Journeys: first-time onboarding; full match (setup→play→save); offline→online resume; export file presence.
  - Retries 2 on CI; collect traces on retry; deflake root causes.
- **Threshold ramp (step 3)**
  - Global: 75/75/75/65; `utils 90/90/90/80`, `stores 85/85/85/75`, `hooks 80/80/80/70`, core files 75/75/75/65

#### Week 4 — Close the gap (hit 80/80/80/70)
- **Branch gap sweep**
  - Cover timeouts, quota exceeded, malformed data recovery, multi-tab concurrency.
- **Accessibility gate**
  - Ensure `jest-axe` runs across modals/pages; fail CI on violations.
- **Threshold ramp (final)**
  - Global: 80/80/80/70; enforce per-scope/file gates above.

### Deliverables checklist
- **Infrastructure**
  - MSW with handlers for auth, storage, sync, error states
  - Deterministic time utilities for timer/autosave tests
  - Codecov upload; publish HTML coverage artifacts in CI
- **Tests**
  - 8–10 unit tests for `utils/*` (edge/branch cases)
  - 6–8 unit tests for `stores/*` (error/retry/state transitions)
  - 12–16 component tests across `HomePage`, `ControlBar`, `TimerOverlay`, `GameInfoBar`
  - 6–8 integration tests (auth, load/save, offline queue, import/export)
  - 3–4 Playwright journeys (onboarding, full match, offline resume, export)
- **CI gates**
  - Remove masking flags; enforce coverage thresholds and a11y; block merges on failures

### Commands and examples
```bash
# Run unit/integration with coverage
npm run test -- --coverage

# Focus on integration tests (pattern examples)
npm test -- --testPathPattern="integration|auth|save|load" --coverage

# Run E2E
npm run test:e2e
```

### KPIs and success criteria
- Coverage trajectory: ~40% → ~60% (W1) → ~68% (W2) → ~75% (W3) → ≥80% (W4)
- E2E: 100% pass for 3–4 critical journeys by Week 3
- A11y: 0 violations in modals/pages
- Stability: flake rate <2%; no open-handle leaks; CI time budget met (unit+integration <10m, E2E <20m)

### Risks and mitigations
- **Large complex components (e.g., `HomePage`, canvas)**: Focus on public behaviors, controlled props, fake timers; avoid implementation-detail assertions.
- **Flakiness**: Use retries only temporarily; prioritize root-cause fixes; add deterministic helpers.
- **Time constraints**: Parallelize writing tests by scope; start with deterministic layers (utils/stores) for quick coverage gains.

### Ownership and cadence
- DRI: Testing lead (assign named owner)
- Weekly retro: review coverage report, top failing specs, flake log; adjust backlog and thresholds as scheduled

### Source of truth for metrics
- Include coverage summary footer in PR descriptions (lines/statements/functions/branches) with commit hash and timestamp
- Store latest HTML report artifact per PR; keep Codecov badge updated in `README.md`


