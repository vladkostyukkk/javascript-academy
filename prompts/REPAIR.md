# Surgical debugging — use when a stage fails

Inspect `AGENTS.md`, `docs/STATE.md` and the exact failing code/command. Reproduce the failure. State one likely root cause supported by evidence and the smallest safe fix. Write a regression test that fails before the change when feasible. Apply only that fix, rerun relevant tests, update `docs/STATE.md` and return the exact results. Do not rewrite unrelated components, skip tests, or replace real functionality with mocks.
