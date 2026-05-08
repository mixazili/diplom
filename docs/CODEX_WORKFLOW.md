# Codex Workflow

Codex must work in PR-based tasks.

## Every task

1. Read:

   - `docs/AGENTS.md`
   - `README.md`

2. Identify current stage of developing the project.

3. Before starting a task:

Never work directly in `main`.

create new branch:

bash
git checkout main
git pull
git switch -c feature/<task-name>

4. Implement backend logic

5. Add backend tests and run

6. If tests passed implement frontend

7. Check if frontend is building and running

8. After finishing task:

npm test
git add .
git commit -m "meaningful message"
git push -u origin feature/<task-name>

Create or prepare a Pull Request.

Do not merge Pull Requests.

Add PR summary to README.md to know current progress of developing the project

Prepare PR summary.

## PR summary format

Use this format:

### What was implemented

### Changed files

### Tests

### How to check all logic manually

### Notes

## Forbidden

- Do not work in main.
- Do not merge PRs.
- Do not disable tests.
- Do not change stack.
- Do not add shop/cart logic.
