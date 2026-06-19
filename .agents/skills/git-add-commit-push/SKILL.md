---
name: git-add-commit-push
description: Commit and push the current workspace changes with a short, intentional git workflow. Use when the user asks to run git add + git commit + git push, says "提交并推送", "整理工作区的改动，提交代码", or wants local changes saved to the current remote branch without opening a PR.
---

# Git Add Commit Push

Use this when the user wants the simple local publish flow: inspect changes, stage them, commit, and push the current branch.

## Assumptions

- The target is the current repository and current branch unless the user says otherwise.
- This skill does not open a PR and does not require `gh`.
- `git add .` is allowed only after confirming the whole visible worktree belongs in the commit.

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
   - Use a terse message that describes the full staged diff.
   - Match the repo's recent style when obvious.
6. Push:
   - Run `git push` when the current branch already tracks a remote branch.
   - Run `git push -u origin <branch>` when there is no upstream.
7. Final report:
   - Include commit SHA, commit message, pushed branch, validation result, and final `git status -sb`.

## Safety Rules

- Never run destructive git commands as part of this skill.
- Never amend, rebase, force-push, reset, restore, or stash unless the user explicitly asks.
- If push fails because the remote moved, stop and report the blocker instead of pulling or rebasing automatically.
- If checks fail, stop before commit unless the user explicitly says to commit anyway.
