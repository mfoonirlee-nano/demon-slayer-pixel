---
name: git-add-commit-push
description: Commit and push the current workspace changes to the remote branch with a short, intentional git workflow. Use when the user asks to run git add + git commit + git push, says "提交并推送", "整理工作区的改动，提交代码", "push code", or wants local changes committed and pushed without opening a PR.
---

# Git Add Commit Push

Use this when the user wants the simple publish flow: inspect changes, stage them, commit, then push the current branch to its remote. The workflow is not complete after commit; it is complete only after push succeeds or a push blocker is reported.

## Assumptions

- The target is the current repository and current branch unless the user says otherwise.
- This skill does not open a PR and does not require `gh`.
- `git add .` is allowed only after confirming the whole visible worktree belongs in the commit.
- Treat "push code" as a request for the full git publish flow: stage, commit, then push.

## Workflow

1. Inspect state:
   - Run `git status -sb`.
   - Run `git diff --stat`.
   - If files are already staged, also run `git diff --cached --stat`.
2. Confirm scope:
   - If the worktree contains only changes clearly related to the user's current request, proceed.
   - If unrelated or ambiguous changes are present, stop and ask which files belong in the commit.
   - Do not silently stage unrelated changes.
3. Stage changes:
   - Prefer explicit `git add <paths>` when the scope is narrow.
   - Use `git add .` only when the full worktree is confirmed in scope.
4. Validate:
   - Run the most relevant quick check before committing when practical.
   - For this repo, prefer `npm run typecheck` for TypeScript/UI changes.
   - If a pre-commit hook runs checks or asset compression, let it complete and report what it changed.
5. Commit:
   - Use a Conventional Commits message that precisely describes the staged diff.
   - Derive the message from `git diff --cached --stat` and, when needed, `git diff --cached`.
   - Prefer `type(scope): summary` when a clear scope exists; use `type: summary` only when a scope would be forced.
   - Keep the summary imperative, specific, and under 72 characters when practical.
   - Do not use vague summaries such as `update code`, `fix stuff`, `misc changes`, or `refactor`.
   - Match the repo's recent scope vocabulary when obvious, but do not copy non-Conventional recent commit styles.
   - After a successful commit, continue immediately to push unless the user explicitly asked not to push.
6. Push:
   - Run `git push` when the current branch already tracks a remote branch.
   - Run `git push -u origin <branch>` when there is no upstream.
   - Confirm the push updated the remote or returned `Everything up-to-date`.
7. Final report:
   - Include commit SHA, commit message, pushed branch/remote, validation result, push result, and final `git status -sb`.

## Safety Rules

- Never run destructive git commands as part of this skill.
- Never amend, rebase, force-push, reset, restore, or stash unless the user explicitly asks.
- If push fails because the remote moved, stop and report the blocker instead of pulling or rebasing automatically.
- If checks fail, stop before commit unless the user explicitly says to commit anyway.

## Commit Message Rules

- Follow Conventional Commits: `<type>(<scope>): <summary>` or `<type>: <summary>`.
- Allowed common types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `style`.
- Choose the type from the user-visible intent and staged diff:
  - `feat`: adds or expands user-facing behavior.
  - `fix`: corrects broken behavior.
  - `refactor`: restructures code without behavior change.
  - `docs`: documentation-only changes.
  - `test`: test-only changes.
  - `chore`: maintenance that is not app behavior.
- Choose a short scope from the touched area when it clarifies the change, such as `reward-ui`, `hud`, `skills`, `assets`, `runtime`, or `tests`.
- Summarize the actual staged result, not the command being run.
- If staged changes cover multiple related areas, summarize the unifying outcome.
- If staged changes are unrelated, stop and ask whether to split the commit instead of hiding unrelated work behind a broad message.
- Examples: `feat(reward-ui): add keyboard selection for upgrade cards`, `fix(reward-ui): keep upgrade cards inside reward panel`, `docs(skills): require conventional commit messages`.
