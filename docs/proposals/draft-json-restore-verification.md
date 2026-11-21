# Proposal for verifying draft restoration from JSON

The practice workspace already lets learners download a draft copy and restore files from JSON. [P05 acceptance](../P05_ACCEPTANCE.md) records JSON import edge cases as unverified. The [lesson contract](../LESSON_CONTRACT.md#пята-частина-p05--явний-імпорт-json-чернетки) describes the intended behavior. Start with browser coverage on the existing `js-01` lesson, using the [progress tests](../../tests/e2e/progress.spec.ts) and their Playwright helpers as references.

## Scenarios for the first PR

| Scenario | Expected result |
| --- | --- |
| Restore a compatible copy | Download a copy through the workspace, save different code, and complete a successful Check on that code. Import the downloaded copy and explicitly confirm. The imported code appears in the editor and survives reload. The pre-import draft is accessible in the archive, and the learner must run a new Check before completing the lesson. |
| Cancel after preview | Select a compatible JSON file and open the confirmation dialog. Cancel the import. The current code is still present immediately and after reload. |
| Reject a copy for another lesson | Select a well-formed snapshot whose lesson ID differs from `js-01`. The workspace explains the incompatibility, blocks import, and preserves the current code after reload. |

## Evidence for review

Run these scenarios against a current production build with the existing desktop Playwright profile. Use a fresh browser context for each test. Check learner-visible behavior in the editor, confirmation dialog, and archive. Report which scenarios ran and any reproducible failures in the implementation PR. Start with the checks in the [repository quality guide](../QUALITY.md#команди-й-особливості-репозиторію).

The first PR is scoped to browser coverage on `js-01`. If a scenario exposes an application defect, record the observed behavior and reproduce it before proposing a fix.
