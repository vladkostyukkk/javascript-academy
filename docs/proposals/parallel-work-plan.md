# Proposal for parallel work on JavaScript Academy

## What I suggest we do first

Vlad continues with P07, the next ten lessons in the cumulative FocusBoard project. I propose verifying that a learner can safely restore a JavaScript draft from a JSON backup. This gives me a practical introduction to the lesson and editor flow while adding coverage for an existing feature of the local prototype.

The [verification plan](draft-json-restore-verification.md) defines the scope and acceptance criteria for the first implementation PR. After we agree on the scope, I'll confirm when to start implementation.

## How P07 and P08 fit together

[P06 has been accepted](../P06_ACCEPTANCE.md), with complete lesson packages and verified checkpoints for `js-01` through `js-10`. The [roadmap](../ROADMAP.md) assigns `js-11` through `js-20` to P07 and `js-21` through `js-30` to P08. P07 adds conditions, functions, validation, and ID generation. P08 develops the same project with arrays, objects, transformations, and statistics.

The [curriculum manifest](../../curriculum/manifest.json) makes `js-20` a prerequisite for `js-21`. A new learner workspace in `js-21` starts from the learner's saved `js-20` checkpoint. The official starter also depends on the verified `js-20` reference, with the intentional gap for the new exercise described in the [lesson contract](../LESSON_CONTRACT.md#fields). P08 acceptance requires 30 verified checkpoints and regression coverage for lessons 1–20.

Theory, quiz questions, exercise ideas, and edge cases for `js-21` can be drafted during P07. The practical exercise, starter, reference solution, and end-to-end transition should use the verified `js-20` checkpoint. At that point, `js-21` is a good first P08 implementation PR. Agree on the checking approach with Vlad before building out P08. `js-10` already uses 29 of the 32 checks allowed by the current shared limit, so P07 may establish a different way to organize cumulative checks. See [ADR-022](../DECISIONS.md#adr-022--єдина-обмежена-місткість-набору-checks).

## How we would work together

- Use `codex/rost` to review this proposal with Vlad.
- Start the verification task on a dedicated branch from current `main` and open a separate PR with the test results.
- Vlad reviews the proposed changes and decides when to merge them into `main`.
- If the verification uncovers a product defect, document the reproduction and agree on the scope of the fix before changing application code.
