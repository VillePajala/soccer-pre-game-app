# Modal Orchestration (Architecture)

Last updated: 2025-08-11

## Goals
- Predictable behavior with multiple concurrent modals
- Strong accessibility (focus trap, background inert)
- Consistent ESC/overlay policies
- Clean, centralized state with measurable performance

## Design
- `uiStore` exposes:
  - `modalStack: Array<ModalKey>`
  - `openModal(modal)`, `closeModal(modal)`, `toggleModal(modal)` maintain stack
  - `closeAllModals()` clears stack and state
  - `isModalOpen(modal)`, `isAnyModalOpen()` helpers
- Top-most modal = last element in `modalStack`
- Body scroll lock when `isAnyModalOpen() === true` (to be wired in app shell)
- Central z-index tokens for overlay and containers (to be added in theme)
- Standard ESC and overlay-click behavior; allow opt-out per modal

## Usage Guidance
- Components should not manage their own stacking; call store actions only
- Only the top-most modal should capture focus; others inert behind overlay
- Keep modal components pure; orchestration belongs to store and wrappers

## Testing
- `src/stores/__tests__/uiStore.test.ts` validates stack invariants (push/pop/toggle/closeAll)
- Component tests should assert:
  - Focus remains within top-most modal via keyboard navigation
  - ESC closes top-most modal
  - Overlay-click closes when allowed

## Performance
- Instrument modal open/close with `performance.mark/measure` (next task)
- Track p95 open and close timings; gate via CI later

## References
- `src/stores/uiStore.ts`
- `docs/quality/CI_QUALITY_GATES.md`

