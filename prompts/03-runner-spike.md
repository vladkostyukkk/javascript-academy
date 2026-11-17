# P03 — isolated JS runner security prototype

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим. Це початковий фазовий prompt: перед повторним використанням перевір, чи фазу вже завершено; не запускай її заново автоматично.

## Exact task
Build the learning runner **in isolation from production lesson authoring**. Provide four fixtures: (A) pure JS with console/return and assertion, (B) DOM manipulation preview, (C) two ES modules importing each other through virtual paths, (D) Promise/async/fetch to a deterministic mock `/mock/tasks.json`. Host student code only in restricted sandboxed contexts; never eval it in app origin or server. Implement per-run message nonce, typed protocol, log/error collection, output limits, and timeout best effort. Test blocked network, top navigation and unsafe messages. Clearly document limits against intentional malicious loops and the remaining security review before public launch.

## Acceptance / stop gate
All four fixtures run deterministically and have a negative test; no server-side or privileged-origin user-code evaluation; document actual security test results and unresolved limitations.
