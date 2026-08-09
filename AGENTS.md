# Repository Agent Instructions

Deliver the requested outcome with grounded, scoped, verified changes while preserving user work. For player-facing work, make delivering a fresh, memorable experience that still feels unmistakably like _Moonlit Tide Survivor_ the primary product goal; treat the current architecture as context, not a creative ceiling. Keep instructions and tool use lean: apply only the rules and references relevant to the task.

## 1. Ground Work in the Repository

- Inspect named files plus the nearest implementation, tests, and scoped documentation before making codebase claims or edits.
- Use repository tools to resolve missing facts. If source, tests, and documentation disagree, identify the conflict instead of silently choosing one.
- Read only the conditional references that match the task; do not preload unrelated documentation.

## 2. Act at the Right Scope

- For requests to answer, explain, review, diagnose, or plan, inspect and report without editing files.
- For requests to change, build, or fix, make the in-scope local edits and run relevant non-destructive checks without asking first.
- Proceed with low-risk, reversible assumptions and state them once. Ask when a missing choice would materially change the result, scope, or safety.
- Ask before destructive or hard-to-reverse actions, external/shared writes, purchases, or a material expansion of scope.
- Preserve unfamiliar worktree changes. Do not discard, overwrite, or include them unless the user puts them in scope.

## 3. Build the Smallest Coherent Experience

- For gameplay, content, art, audio, narrative, and UX work, start from the player-facing decision, emotion, mastery, or surprise the change should create. Judge success by what becomes different in play, not by how much existing code is reused.
- Treat current mechanics, content, and module boundaries as a starting point rather than fixed limits. If a materially better requested experience needs a new mechanic or a different boundary, make the smallest coherent structural change that fully supports it and verify the affected behavior.
- When a request leaves meaningful design freedom, briefly consider at least two materially different experience directions before choosing. Prefer the one with the strongest gameplay payoff, novelty, readability, and stylistic fit; present alternatives only when the user's choice would materially change the result.
- When the request seeks novelty or leaves meaningful design freedom, apply this test: does the change give the player a new but understandable decision, sensation, or mastery opportunity? A reskin, renamed mechanic, or pure increase in health, speed, spawn rate, or effect volume does not qualify by itself.
- Preserve the game's identity while inventing within it: single-run 2D side-scrolling pixel action survival; a dark, moonlit Japanese-fantasy journey; original night demons contrasted with bright, fluid moon-and-tide hero effects; readable silhouettes and attack tells; responsive controls; and concise, poetic presentation. Extend this visual and gameplay grammar instead of copying existing content or third-party IP.
- Use the established design pillars as creative constraints, not as a checklist of existing mechanics: clear control, readable pressure, run-bound builds, meaningful content rotation, and pixel-scale recognition. Use only the relevant combination of mechanics, animation, VFX, audio, camera, and UI feedback needed to communicate the intended experience clearly.
- Implement behavior that is correct for all valid inputs, with every changed line tracing to the requested outcome, including the chosen in-scope player experience where applicable.
- Match established code conventions and reuse current constants, modules, and test seams when they fit the chosen design; do not preserve an existing seam at the cost of a substantially weaker experience.
- Keep unrelated code, comments, formatting, and pre-existing dead code unchanged. Remove only artifacts made unused by the change.
- Exclude unrelated feature volume, one-off abstractions, speculative configurability, and handling for impossible internal states. Seek novelty through one focused interaction, encounter, system, or presentation idea rather than breadth for its own sake.
- Treat tests as evidence of correctness, not targets to hard-code around. Report an incorrect test or infeasible requirement instead of weakening it.
- Remove unrequested scratch files and helper scripts before finishing; preserve intermediates required by an applicable workflow.

## 4. Execute and Verify Efficiently

- Define success criteria proportional to risk. A trivial edit may need one clear check; a multi-step task should use a short `step -> verification` plan.
- Run independent reads and checks in parallel when it improves latency; keep steps sequential when later inputs depend on earlier results.
- Use subagents for isolated or genuinely independent workstreams. Handle simple searches, one-file edits, and context-coupled steps directly.
- Run focused checks while editing, then the broader checks justified by the affected behavior. Continue until they pass or a concrete blocker remains.
- Before finishing, inspect the final diff and report the validation evidence and material residual risks.

## 5. Communicate Results

- Lead with the outcome. Include supporting evidence, material caveats, and the next action when one exists.
- Keep progress updates factual and concise. State each assumption or tradeoff once.

## 6. Runtime Restrictions

- Do not start headless browsers.
- Do not start game processes.
- When deleting files under `dist/assets`, run `npm run clean:dist-assets` instead of direct `rm` commands.

## 7. Conditional References

Read each applicable file completely before acting:

- Gameplay, content, balance, narrative, UX, or other player-facing design changes: [`docs/game-design/README.md`](docs/game-design/README.md), then [`docs/game-design/game-overview.md`](docs/game-design/game-overview.md) and the relevant design document located from that index. Use their experience boundaries and design pillars; verify current implementation claims against source.
- Code or TypeScript changes: [`docs/CODE_RULES.md`](docs/CODE_RULES.md).
- Runtime module boundaries, input, HUD snapshots, or render order: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Map generation, platform reachability, or reward placement: [`docs/map-generation.md`](docs/map-generation.md).
- Bitmap generation or editing: [`workflows/imagegen-project-asset.md`](workflows/imagegen-project-asset.md), then [`docs/SPRITES.md`](docs/SPRITES.md). Use [`docs/art/README.md`](docs/art/README.md) to locate the relevant visual brief.
- Music or audio-direction changes: [`docs/music-direction.md`](docs/music-direction.md).
- Command names and available scripts: [`package.json`](package.json).

These references own their current detailed rules and design intent. Architecture and current-implementation descriptions are baselines to understand, not immutable product limits. When an implementation change crosses one of those baselines, keep the affected implementation, tests, and documentation consistent.
