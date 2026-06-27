---
name: sprite-sequence-pipeline
description: Generate, repair, integrate, and validate 2D sprite sequence sheets for this game. Use when creating or revising any frame-based sprite sheet, including player skills, enemy or Boss actions, VFX/effect strips, UI animations, environment animations, icons only when bundled with sequence work, and when animation scale, continuity, cropping, frame dimensions, transparency, anchors, or runtime linkage needs fixing.
---

# Sprite Sequence Pipeline

## Quick Start

1. Identify the asset domain and read only the relevant local references:
   - Always check `docs/SPRITES.md` for the sprite contract and naming conventions.
   - For player assets, read `docs/art/player.md`, `docs/game-design/player-skills.md`, relevant player constants, and nearby player sprites.
   - For enemy or Boss assets, read the relevant archetype/Boss docs, constants, loader/catalog entries, and nearby existing sprites.
   - For UI, environment, item, or VFX-only assets, read the relevant catalog/constants and adjacent assets.
2. Identify the runtime contract before generation:
   - target path
   - frame count and layout
   - `frameW` / `frameH`
   - animation order and loop behavior
   - draw scale, anchors, baseline, center point, or spawn point
   - docs/constants/loaders/tests that must be updated
3. Use the `imagegen` skill for bitmap generation. Do not replace requested generated sprites with canvas/SVG/code-drawn art.
4. For built-in `imagegen`, treat `image_generation_call.result` as the only trusted artifact source. Decode the PNG base64 into `tmp/imagegen/`; do not search generated-image folders for the latest output.
5. Save sources and intermediates under `tmp/imagegen/`, remove chroma key locally, then write final transparent PNGs into the runtime asset path.
6. Verify dimensions, alpha margins, frame continuity, runtime scale/anchor, docs/constants sync, typecheck, lint, and `git diff --check`. Do not start browsers or the game process.

## Imagegen Prompt Rules

- Generate actor sheets, effect sheets, and icons separately unless the runtime contract explicitly combines them.
- State whether the sheet includes an actor, an effect-only VFX strip, a UI animation, an environment animation, or a Boss/enemy action.
- Use a flat `#00ff00` chroma-key background with no shadows, gradients, floor plane, text, watermark, or key color inside the subject.
- Reference the relevant project art direction and adjacent assets. Match silhouette, palette, camera angle, outline weight, pixel density, and apparent scale.
- For actor sheets, the generated character/enemy/Boss must keep the same model, costume, proportions, weapon/limb placement logic, and visual identity across all frames.
- For effect-only sheets, do not include actors or weapons unless the runtime asset is expected to contain them.
- Explicitly request exact frame count, horizontal sprite sheet layout unless otherwise required, generous padding, and "do not crop any frame".

## Sequence Frame Quality Rules

- Treat cropping, continuity, identity, and impact as separate acceptance criteria. Fixing margins is not enough if the animation jumps, the actor changes identity, or the effect reads weakly.
- Lock every frame to the same baseline, center anchor, viewing angle, style, palette, pixel density, and apparent scale unless the animation intentionally changes one of them.
- Prompt important middle frames explicitly. For peak-and-decay effects, describe frame N as the direct continuation of frame N-1, not a new side wave, slash, pose, or unrelated shape.
- Preserve the same motion family through the whole strip: wind-up, growth, peak, decay, and fade for effects; anticipation, contact, follow-through, and recovery for actors.
- For impact effects, specify force cues directly: bright contact point, broad base shock ring, dense particles/droplets, strong value contrast, readable peak frame, and clear dissipation.
- Inspect the sequence midpoint before replacing assets. Middle frames often reveal hidden discontinuity after a good-looking start and end.
- If fitting the source into the current frame size forces the important frame to shrink too much, prefer a modest frame contract expansion plus updated constants/docs over accepting a weak-looking asset. Keep gameplay hitboxes unchanged unless the user asks for behavior changes.
- Validate progression with alpha bboxes, not just visual preview: sizes and centers should evolve smoothly without sudden width/height collapse, anchor drift, or identity change.

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
- If imagegen did not space frames evenly, use custom source windows per frame. Do not accept hard cuts through silhouettes, trails, weapons, limbs, particles, or VFX arcs.
- Keep final frames within alpha margins. Any bbox touching frame edges is a failed asset unless the source contract intentionally allows it.
- Preserve source and intermediate files in `tmp/imagegen/` for audit and later iteration.

## Runtime Scale And Anchors

- Compare runtime-displayed alpha bbox size, not raw source size.
- Use the domain's actual rendering contract: `drawScale`, `anchorX`, `anchorY`, center drawing, baseline drawing, `visualY`, loop frames, or effect spawn offsets may differ by asset type.
- For actor sheets, compare displayed size against the nearest existing actor sprites in the same domain.
- For effect sheets, compare displayed size against the hitbox or visual target it represents, but do not change gameplay hitboxes unless requested.
- If only runtime size or placement is wrong, prefer adjusting draw scale or anchor constants over regenerating the art.
- When changing `frameW`, `frameH`, frame count, or draw scale, update all corresponding constants, loaders/catalogs, docs, and tests.

## Gameplay And Integration

- Keep visual fixes separate from gameplay changes unless the user explicitly asks for behavior changes.
- Reuse existing runtime helpers, loaders, catalogs, animation state, damage/effect systems, and validation tests.
- For visual-only effects, mark or route them through existing visual-only paths so damage and collision logic do not change accidentally.
- When adding a runtime state for a new animated asset, store enough data to finish it deterministically: start, target, elapsed, duration, frame, facing, scale/anchor, and any hit tracking if relevant.
- Do not grant invincibility, piercing, Boss/projectile immunity, collision changes, or new control behavior unless the user asks for it explicitly.

## Validation Checklist

- PNG dimensions exactly match runtime constants and docs.
- Frame count, frame size, and animation order match the consuming code.
- Each frame has non-empty alpha content and safe transparent margins.
- Chroma key is removed cleanly, including transparent corners and no visible key fringe.
- Alpha bboxes show coherent size, center, baseline, and identity progression across frames.
- Runtime-displayed size and placement match nearby sprites/effects.
- Relevant docs/constants/loaders/tests are updated.
- Run the narrowest relevant tests, plus `npm run typecheck`, `npm run lint`, and `git diff --check` when practical.
- Do not start headless browsers or the game process.

## Final Report

Report:
- Final asset paths.
- Source/intermediate imagegen paths.
- Final prompt summary.
- Runtime constants changed, especially `frameW`, `frameH`, frame count, draw scale, anchors, baseline, or loop behavior.
- Validation commands and results.
