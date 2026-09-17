# Repository Guide

_Moonlit Tide Survivor_ is a React/TypeScript single-run 2D side-scrolling pixel action-survival game: a dark, moonlit Japanese-fantasy journey where original night demons meet bright, fluid moon-and-tide hero effects, readable silhouettes and attack tells, responsive controls, run-bound builds, and concise poetic presentation.

Use `pnpm` and `pnpm-lock.yaml`; treat the scripts in [`package.json`](package.json) as the command source of truth. Run documented `npm run <script>` commands as `pnpm run <script>`.

## Grounding and Scope

- Ground claims in the relevant implementation and tests. Design documents describe intent and may include unimplemented targets; surface conflicts with current behavior.
- Answers, reviews, diagnoses, and plans are inspection tasks unless changes are also requested. For change requests, complete the smallest coherent solution, including necessary documentation and validation, while preserving unrelated worktree changes.
- Continue authorized local edits, relevant checks, and fixes for failures caused by the change without asking for approval at each step. Completion means the requested outcome is implemented and applicable checks pass, or a blocker is documented with the remaining work. Follow the validation tiers in `docs/CODE_RULES.md`; repeat checks when changes or failures justify it.

## Player-Facing Work

- Start gameplay, content, art, audio, narrative, and UX work from the player decision, emotion, mastery, or surprise it should create. Judge success by what becomes meaningfully different in play.
- When meaningful design freedom exists, compare at least two materially different directions, then choose one focused experience with the strongest payoff, novelty, readability, and stylistic fit. A reskin, rename, or pure increase in stats, spawn rate, or effect volume is not sufficient novelty by itself. Treat current mechanics and architecture as context, not a creative ceiling, while extending the game's original visual and gameplay grammar.

## Runtime Guardrails

- Do not start headless browsers or game processes.
- For deletion under `dist/assets`, use `pnpm run clean:dist-assets`.

## Load When Applicable

Use these references when the task touches the listed concern. Read only sections needed for the task; follow further references when they resolve a concrete dependency or uncertainty.

- **Code changes:** use [`docs/CODE_RULES.md`](docs/CODE_RULES.md) for conventions and ownership. For documentation or asset-only changes, use its validation and documentation-sync sections.
- **Player-facing design or behavior changes:** use [`docs/game-design/README.md`](docs/game-design/README.md) to locate the relevant design document; use [`docs/game-design/game-overview.md`](docs/game-design/game-overview.md) for overall direction and core-loop decisions.
- **Runtime lifecycle or ownership, React-Canvas boundaries, input, HUD snapshots, asset or audio loading, or render order:** read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **Map segments, platform reachability, or high-platform treasure placement:** read [`docs/map-generation.md`](docs/map-generation.md).
- **Bitmap generation or editing:** follow [`workflows/imagegen-project-asset.md`](workflows/imagegen-project-asset.md), which routes to the applicable sprite contract and visual brief.
- **Cross-state combat-actor visual audits or unification:** follow [`workflows/character-state-visual-unification.md`](workflows/character-state-visual-unification.md) before changing runtime assets.
- **Music direction, BGM prompts, or Boss/enemy/player SFX recipes:** read [`docs/music-direction.md`](docs/music-direction.md).
- **Agent instructions or skills:** keep triggers task-specific, share authoritative rules by link, and state completion and real stopping conditions. Preserve project constraints; keep tool recipes in the workflow that owns them.
