---
name: player-skill-sprite-pipeline
description: Generate, repair, integrate, and validate 2D player skill sprite sheets for this game. Use when creating or revising player skill skill/effect/icon PNG assets, when the user mentions imagegen for character skills, or when skill animation scale, cropping, frame width, transparency, or gameplay linkage needs fixing.
---

# Player Skill Sprite Pipeline

## Quick Start

1. Read the local references before changing assets:
   - `docs/art/player.md`
   - `docs/game-design/player-skills.md`
   - `docs/SPRITES.md`
   - `src/constants/assets.ts`
   - relevant `assets/art/player-*.png` concept art and existing `assets/sprites/player/*.png`
2. Identify the target skill id and runtime sheet contract from constants/docs:
   - `assets/sprites/skills/<skill_id>/skill.png`
   - `assets/sprites/skills/<skill_id>/effect.png`
   - `icon.png` only if the user asks for icon work.
3. Use the `imagegen` skill for bitmap generation. Do not replace requested generated sprites with canvas/SVG/code-drawn art.
4. For built-in `imagegen`, treat `image_generation_call.result` as the only trusted artifact source; it is PNG base64. Decode it into `tmp/imagegen/` instead of searching `~/.codex/generated_images/` or any other directory for generated files.
5. Save generated sources into `tmp/imagegen/`, remove chroma key locally, then write final transparent PNGs into `assets/sprites/skills/<skill_id>/`.
6. Verify dimensions, alpha margins, runtime scale, typecheck, lint, and `git diff --check`. Do not start browsers or the game process.

## Imagegen Prompt Rules

- Generate `skill.png` and `effect.png` separately.
- `skill.png` includes the character action sequence; `effect.png` is independent skill visual/damage effect unless the codebase already expects otherwise.
- Use a flat `#00ff00` chroma-key background with no shadows, gradients, floor plane, text, watermark, or key color inside the subject.
- Prompt from project art direction: deep blue Moon Tide style, silver-white foam crests, blue curved water lines, moon-blue rim light, readable pixel-art action.
- Explicitly request exact frame count, horizontal sprite sheet layout, generous padding, and “do not crop the effect or character”.
- When matching an existing character, reference the actual player sprite and concept art. The generated character must match the player silhouette, costume, palette, and apparent size.

## Post-Processing

- Use the installed chroma helper, not ad hoc color deletion:
  ```bash
  python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
    --input tmp/imagegen/<source>.png \
    --out tmp/imagegen/<alpha>.png \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --despill
  ```
- Split by frame, crop to alpha bbox with margin, resize proportionally, and pad into the exact runtime frame size.
- If imagegen did not space frames evenly, use custom source windows per frame. Do not accept hard vertical cuts through water trails or character silhouettes.
- Keep final frames within alpha margins. Any bbox touching frame edges is a failed asset unless the source contract intentionally allows it.
- Preserve source and intermediate files in `tmp/imagegen/` for audit and later iteration.

## Runtime Scale And Anchors

- Compare runtime-displayed size, not raw source size.
- For player skill sheets, runtime draw size is usually `frameW/frameH * drawScale`, anchored by optional `anchorX`/`anchorY`.
- Measure alpha bbox after runtime scale against existing player animation sheets:
  - `player_run` is the primary movement reference.
  - `player_idle`, `player_jump`, and `player_attack` are secondary sanity checks.
- If only the in-game character size is wrong, prefer adjusting `drawScale` and `anchorY` in `src/constants/assets.ts` over regenerating the art.
- Example from `dash_reposition`: a `480x360` skill frame with `drawScale: 0.42` and `anchorY: 0.9` made the skill character height match `player_run` at about `94px`.

## Gameplay Integration

- Keep visual fixes separate from gameplay changes unless the user explicitly asks for behavior changes.
- If an effect is visual-only, mark it with `visualOnly` and ensure damage update code skips it.
- Reuse existing damage, boss damage, hit burst, slash, defeat, cooldown, and equipment refund helpers.
- When adding a runtime skill state, store enough data to finish the skill deterministically: start, target, elapsed, duration, level, damage multiplier, facing, refund group, and hit tracking.
- Do not grant invincibility, piercing, Boss/projectile immunity, or new collision behavior unless the user asks for it explicitly.

## Validation Checklist

- PNG dimensions exactly match constants and docs.
- Each frame has non-empty alpha content and safe margins.
- Character runtime size matches existing player sprites.
- Skill/effect frame widths in `src/constants/assets.ts` match image dimensions.
- Documentation in `docs/SPRITES.md` and design/numeric docs reflects changed behavior or dimensions.
- `npm run typecheck`
- `npm run lint` (report existing warnings separately from new errors)
- `git diff --check`
- No headless browser and no game process.

## Final Report

Report:
- Final asset paths.
- Source/intermediate imagegen paths.
- The final imagegen prompt or a concise prompt summary.
- Runtime constants changed, especially `frameW`, `drawScale`, `anchorX`, and `anchorY`.
- Validation commands and results.
