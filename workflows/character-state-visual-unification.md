# Character-State Visual Unification Workflow

## Purpose

Unify combat actor identity across animation states so the player, every enemy, and every Boss read as the same character within their own state set.

This workflow is for fixing visual drift across state sprite sheets, not changing gameplay behavior.

## Trigger

Run this workflow when the user asks to unify, audit, standardize, or repair combat actor appearance across animation states.

Examples:

- "统一这个项目里角色在不同状态下的形象"
- "make the player/enemy/Boss states look like the same character"
- "audit sprite identity drift"
- "fix inconsistent character sheets"

## Resolved Scope

In scope:

- Player body animation sheets under `assets/sprites/player/`.
- Player skill cast body sheets under `assets/sprites/skills/*/skill.png`.
- Player ultimate cast body sheet under `assets/sprites/skills/ultimate_skill/skill.png`.
- Enemy body animation sheets under `assets/sprites/enemies/<enemy>/`.
- Boss body animation sheets under `assets/sprites/boss/<boss>/`.
- Body-like clones, afterimages, summons, nightmares, and other actor proxies when the sheet contains a recognizable body or identity proxy for a combat actor.

Out of scope unless explicitly pulled in later:

- Pure skill, projectile, aura, zone, UI, background, platform, ground, cloud, and cover assets.
- Gameplay hitboxes, timings, damage, spawn rules, or behavior state machines.
- Actor redesign that changes the actor's intended gameplay read, unless the audit marks the existing identity baseline as conflicted and the user approves a new baseline.

## Resolved Workflow Shape

Run a full audit first, then fix assets in actor-sized batches.

The audit must cover every in-scope combat actor and produce a decision-ready report. Asset replacement is a later step and should process one actor at a time so each identity set can be validated before moving on.

The audit must not modify runtime assets.

## Identity Baseline

For each combat actor, the audit defines an identity baseline from:

1. `docs/art/**` Visual Identity and related art direction.
2. Matching concept images under `assets/art/*-concept.png`.
3. If the documentation or concept image is missing or contradictory, the actor's primary runtime sheet as a temporary baseline:
   - Player: `assets/sprites/player/player_idle.png`.
   - Player skill cast body sheets: compare back to the player baseline.
   - Enemy: the move/approach/stalk/hover primary sheet registered in `ENEMY_SHEETS`.
   - Boss: the primary move sheet registered for that Boss.

The audit report must label each actor as one of:

- `baseline clear`: docs/concept/runtime agree well enough to judge drift.
- `baseline missing`: no reliable docs or concept reference exists.
- `baseline conflict`: docs, concept, and current runtime assets disagree in a way that needs a human decision before repair.

## Runtime Sprite Contract Changes

Repair work may change sprite-sheet dimensions, per-frame width/height, frame count, anchors, draw scale, and related asset catalog constants when visual unification requires it.

Any runtime sprite contract change must stay scoped to rendering and asset slicing. It must not silently change gameplay hitboxes, attack timing, damage, spawn logic, enemy behavior, Boss behavior, or player skill behavior.

The audit should distinguish:

- `asset-only repair`: replace PNG content while preserving current runtime sprite contract.
- `sprite-contract repair`: replace PNG content and update render/slicing constants.
- `design-baseline repair`: needs a human-approved identity baseline before asset work because the existing baseline is missing or conflicted.

## Checkpoint Before Repair

After the full audit, repair work requires user approval per combat actor.

The checkpoint brief for each actor must include:

- Actor id and display name if documented.
- Identity baseline source.
- Drift summary across states.
- Proposed sheet changes.
- Whether the repair is `asset-only repair`, `sprite-contract repair`, or `design-baseline repair`.
- Main risk and recommended action.

The workflow must not ask for approval per individual PNG unless the actor has an unusually large or conflicted state set. The workflow must not approve the whole project in one batch.

## Audit Artifact

Persist the full audit report at `docs/art/character-state-audit.md`.

The report is the source of truth for repair prioritization. After each actor repair, update the actor's audit status instead of relying on conversation history.

The report should use this structure:

```markdown
# Character-State Visual Audit

## Summary

| Severity | Count | Notes |
| --- | ---: | --- |

## Priority Queue

| Priority | Actor | Severity | Repair Type | Recommended Action |
| ---: | --- | --- | --- | --- |

## Actor Findings

### <actor id>

- Display name:
- Category: player / enemy / boss / proxy
- Runtime status:
- Baseline status: baseline clear / baseline missing / baseline conflict
- Baseline sources:
- In-scope sheets:
- Out-of-scope related sheets:
- Severity: ok / minor / major / blocker
- Repair type: asset-only repair / sprite-contract repair / design-baseline repair
- Drift summary:
- Recommended action:
- Approval status: pending / approved / repaired / skipped
- Validation notes:
```

## Audit Method

Use script-assisted inventory and human visual judgment.

The audit script or command should collect:

- Every in-scope sheet path.
- Registered frame width, frame height, frame count, draw scale, anchor, and related asset catalog constants when available.
- Actual PNG dimensions.
- Per-frame alpha bbox and empty-frame checks.
- Contact sheets or sampled frames for visual review.

The audit judgment should be made by comparing contact sheets against the actor's identity baseline. Image generation tools may create or edit repair candidates later, but they must not be treated as the only authority for whether a sprite still reads as the same actor.

Create and use `scripts/audit-character-sprites.mjs` for the script-assisted part of the audit.

The script should write generated audit files under `tmp/character-state-audit/`, including:

- A machine-readable inventory, such as `inventory.json`.
- A human-readable inventory summary.
- Contact sheets or sampled-frame PNGs grouped by actor.
- Per-sheet diagnostics for actual dimensions, declared dimensions, expected frame count, frame bboxes, empty frames, and transparent edge checks.

The script output is supporting evidence. The persistent decision record remains `docs/art/character-state-audit.md`.

## Execution Steps

1. Read this workflow, `workflows/imagegen-project-asset.md`, `docs/SPRITES.md`, and relevant `docs/art/**` files.
2. Build or update `scripts/audit-character-sprites.mjs`.
3. Run the audit helper to produce `tmp/character-state-audit/` inventory, diagnostics, and contact sheets.
4. Write or update `docs/art/character-state-audit.md` using the report structure above.
5. Present the highest-priority actor repair brief and wait for actor-level approval.
6. For an approved actor, repair only the approved drifting sheets by following `workflows/imagegen-project-asset.md`.
7. Update asset catalog constants only when the approved repair is a `sprite-contract repair`.
8. Validate the actor repair.
9. Update `docs/art/character-state-audit.md` with repaired/skipped status and validation notes.
10. Repeat from the next actor-level repair brief.

## Audit Severity

Use this severity scale for each actor and, when useful, each sheet:

- `ok`: reads as the same actor and matches the baseline well enough; no repair.
- `minor`: visible differences exist but do not harm identity or gameplay readability; repair only if nearby work touches the actor.
- `major`: clearly drifts from the actor baseline; should be scheduled for repair.
- `blocker`: identity is broken, conflicts with the approved design baseline, or harms gameplay readability; repair before lower-severity actors.

Every non-`ok` finding must include a one-sentence reason and a recommended action.

## Repair Priority

When multiple actors need repair, prioritize:

1. Player character and player body cast sheets.
2. Runtime-enabled, high-frequency regular enemies.
3. Current Boss rotation and final Boss.
4. Runtime-enabled but lower-frequency or late-game actors.
5. Reserved or not-yet-enabled actors.

## Repair Scope Per Actor

Default to repairing only the drifting sheets for an actor.

Consider regenerating a whole actor state set only when:

- More than half of the actor's in-scope sheets are `major` or `blocker`.
- The identity baseline is conflicted and the user approves a new baseline.
- The existing primary runtime sheet is itself unusable as an identity anchor.

## Validation After Actor Repair

After repairing an actor, validate:

- PNG dimensions match the intended sprite contract.
- Registered frame width, frame height, frame count, draw scale, anchor, and related asset catalog constants match the final files.
- Every frame has non-empty alpha content unless intentionally blank and documented.
- Alpha edges, transparent corners, and per-frame bbox margins are acceptable for runtime drawing.
- Contact sheets or sampled frames show the repaired sheets read as the same actor baseline.
- Action readability is preserved for move, attack, cast, recover, death, clone, summon, or proxy states as applicable.
- No gameplay hitboxes, timings, damage, spawn logic, or behavior state machines changed unless explicitly approved in a separate task.

Run:

```bash
npm run typecheck
npm run lint
git diff --check
```

Do not start headless browsers. Do not start game processes.

## Done

This workflow spec is ready for implementation when an agent can:

1. Build the audit helper script.
2. Generate the full inventory and contact sheets.
3. Write `docs/art/character-state-audit.md`.
4. Present actor-level repair briefs in priority order.
5. Repair approved actors using the project imagegen asset workflow.
6. Validate repaired assets without starting browsers or game processes.
