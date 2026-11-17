# P04 — Monaco IDE and evaluation workflow

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим. Це початковий фазовий prompt: перед повторним використанням перевір, чи фазу вже завершено; не запускай її заново автоматично.

## Exact task
Integrate Monaco with file tabs/tree, editable virtual files, Run/Check controls, console, preview, test output and progressive hints. Connect to real isolated runner from P03. Implement view state and error boundaries, reset confirmation and readable feedback. Create a non-trivial real learner exercise that fails before edit and passes after solution; make no 'always pass' mocks. Keep student code separate from test code and solutions.

## Acceptance / stop gate
Editing files changes run result; Run displays console/preview; Check reports specific failing/passing assertions in Ukrainian; invalid JS reports syntax error; reset requires confirmation.
