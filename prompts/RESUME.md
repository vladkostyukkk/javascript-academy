# Fresh Codex session — no context assumptions

Act as the engineer continuing an existing project, not starting from scratch.
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md`, `docs/DECISIONS.md` and relevant code. Check `git status`, recent commits and test scripts.
2. In <=12 lines report: current phase, what is already implemented, last verified commands/results, blockers, next concrete task. Explicitly flag outdated or contradictory docs.
3. **Do not modify code yet.** Wait for a new bounded instruction or suggest the next uncompleted acceptance criterion from `docs/STATE.md`.
4. Do not assume old chat history is available. Trust the repository and verified tests, and ask only for truly blocking product decisions.
