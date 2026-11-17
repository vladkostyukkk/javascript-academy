# Definition of Done and audit checklist

- The requested stage works end to end; no inert buttons or invented success states.
- New behavior has unit or E2E tests; test commands and results listed in `docs/STATE.md`.
- No TypeScript errors, lint errors, build errors, or new accessibility regressions.
- The editor autosaves; the learner can restore after browser refresh.
- User code is never passed to server eval, and sandbox/bridge boundary verified.
- Every reference solution works and is tested; broken learner code receives actionable Ukrainian feedback.
- Mobile/theory mode is usable, keyboard and screen readers can reach controls.
- If lesson IDs, state shape or starter files changed: migration plan and existing-user compatibility are explicit.
- Release only after examining infinite loops, network requests, nested iframe/popup/top navigation attempts and XSS vectors in preview and feedback rendering.
- Final ZIP export includes README, index.html, CSS, JS, fixture mock data if needed, and practical local launch instructions; exported app uses no private platform backend.
