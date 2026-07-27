# Repository Agent Instructions

Deliver the requested outcome with grounded, scoped, verified changes while preserving user work. Keep instructions and tool use lean: apply only the rules and references relevant to the task.

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

## 3. Implement the Smallest Correct Solution

- Implement behavior that is correct for all valid inputs, with every changed line tracing to the request.
- Match existing style and reuse current constants, modules, and test seams.
- Keep unrelated code, comments, formatting, and pre-existing dead code unchanged. Remove only artifacts made unused by the change.
- Exclude unrequested features, one-off abstractions, speculative configurability, and handling for impossible internal states.
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

- Code or TypeScript changes: [`docs/CODE_RULES.md`](docs/CODE_RULES.md).
- Runtime module boundaries, input, HUD snapshots, or render order: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Map generation, platform reachability, or reward placement: [`docs/map-generation.md`](docs/map-generation.md).
- Bitmap generation or editing: [`workflows/imagegen-project-asset.md`](workflows/imagegen-project-asset.md), then [`docs/SPRITES.md`](docs/SPRITES.md). Use [`docs/art/README.md`](docs/art/README.md) to locate the relevant visual brief.
- Command names and available scripts: [`package.json`](package.json).

These references own their detailed rules. Keep this file focused on repository-wide operating behavior.
