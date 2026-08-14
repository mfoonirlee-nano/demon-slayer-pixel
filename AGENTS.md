# Repository Guide

_Moonlit Tide Survivor_ is a React/TypeScript single-run 2D side-scrolling pixel action-survival game: a dark, moonlit Japanese-fantasy journey where original night demons meet bright, fluid moon-and-tide hero effects, readable silhouettes and attack tells, responsive controls, run-bound builds, and concise poetic presentation.

Use `pnpm` and `pnpm-lock.yaml`; treat the scripts in [`package.json`](package.json) as the command source of truth.

## Grounding and Scope

- Inspect the named area and its nearest implementation and tests before making claims or edits. Load only the matching references below. Design documents may describe unimplemented targets; source and tests establish current behavior. Surface conflicts instead of silently choosing a version.
- Match the requested action: inspect and report for answers, reviews, diagnoses, and plans; for change requests, make the smallest coherent local edit and verify it. Preserve unrelated worktree changes, code, comments, and formatting. Finish only when the relevant checks pass or an unrelated blocker is documented and the final diff contains only task-scoped changes.

## Player-Facing Work

- Start gameplay, content, art, audio, narrative, and UX work from the player decision, emotion, mastery, or surprise it should create. Judge success by what becomes meaningfully different in play.
- When meaningful design freedom exists, compare at least two materially different directions, then choose one focused experience with the strongest payoff, novelty, readability, and stylistic fit. A reskin, rename, or pure increase in stats, spawn rate, or effect volume is not sufficient novelty by itself. Treat current mechanics and architecture as context, not a creative ceiling, while extending the game's original visual and gameplay grammar.

## Runtime Guardrails

- Do not start headless browsers or game processes.
- For deletion under `dist/assets`, use `pnpm run clean:dist-assets`.

## Load When Applicable

Read every matching reference completely before acting; apply multiple bullets when a task crosses domains:

- **Any repository edit:** read [`docs/CODE_RULES.md`](docs/CODE_RULES.md) for correctness, scope, conventions, validation, and documentation sync.
- **Player-facing design or implementation:** read [`docs/game-design/README.md`](docs/game-design/README.md), then [`docs/game-design/game-overview.md`](docs/game-design/game-overview.md) and the relevant design document. Use design docs for intent and source/tests for implementation status.
- **Runtime lifecycle or ownership, React-Canvas boundaries, input, HUD snapshots, asset or audio loading, or render order:** read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **Map segments, platform reachability, or high-platform treasure placement:** read [`docs/map-generation.md`](docs/map-generation.md).
- **Bitmap generation or editing:** follow [`workflows/imagegen-project-asset.md`](workflows/imagegen-project-asset.md), which routes to the applicable sprite contract and visual brief.
- **Cross-state combat-actor visual audits or unification:** follow [`workflows/character-state-visual-unification.md`](workflows/character-state-visual-unification.md) before changing runtime assets.
- **Music direction, BGM prompts, or Boss/enemy/player SFX recipes:** read [`docs/music-direction.md`](docs/music-direction.md).
