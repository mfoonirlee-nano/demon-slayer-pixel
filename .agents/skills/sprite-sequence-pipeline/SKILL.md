---
name: sprite-sequence-pipeline
description: Create, repair, or integrate frame-based sprite sheets; fix frame continuity, cropping, scale, transparency, or anchors. Standalone bitmaps use the imagegen project workflow.
---

# Sprite Sequence Pipeline

## Choose the Work

- For generated or edited bitmap content, follow [the imagegen project workflow](../../../workflows/imagegen-project-asset.md). It owns trusted artifacts, generation, deterministic processing, retries, and delivery.
- For scale, anchor, or playback fixes, inspect the consuming code and [sprite contract](../../../docs/SPRITES.md). Adjust the existing runtime configuration when it can meet the visual requirement.
- For cross-state actor identity or scale unification, use [the character-state workflow](../../../workflows/character-state-visual-unification.md).
- For actor motion, costume continuity, or weapon/VFX sequence repairs, read [the character sequence lessons](../../../docs/art/character-sequence-lessons.md). Use its two-endpoint repair method, prompt template, and visual review criteria; keep case-specific poses and frame counts scoped to their original action.

Read the target's section in `docs/SPRITES.md` and its brief through [the art index](../../../docs/art/README.md). Load gameplay design only when the intended action or tell is unclear or behavior is changing.

Before replacement, establish the target path, frame dimensions/count/order, loop behavior, displayed scale, anchor/baseline, and consuming constants or catalog. Preserve gameplay hitboxes and damage behavior for visual-only requests.

## Sequence Generation

Use `imagegen` for bitmap creation. Generate actors, effects, and icons separately unless the runtime contract combines them. Specify exact frame count/layout, generous padding, and the existing silhouette, palette, viewing angle, pixel density, and apparent scale.

For chroma-key sources, request flat `#00ff00`, no floor/shadow/gradient/text, and no key color within the subject. Effect-only strips contain no actor or weapon unless required by the contract.

## Sequence Frame Quality Rules

- Treat cropping, continuity, identity, and impact as separate acceptance criteria. Fixing margins is not enough if the animation jumps, the actor changes identity, or the effect reads weakly.
- Lock every frame to the same baseline, center anchor, viewing angle, style, palette, pixel density, and apparent scale unless the animation intentionally changes one of them.
- Prompt important middle frames explicitly. For peak-and-decay effects, describe frame N as the direct continuation of frame N-1, not a new side wave, slash, pose, or unrelated shape.
- Preserve the same motion family through the whole strip: wind-up, growth, peak, decay, and fade for effects; anticipation, contact, follow-through, and recovery for actors.
- For impact effects, choose force cues that fit the action: directional silhouette, layered flow, value contrast, a readable peak, and clear dissipation. Add shock rings or dense bursts only when the intended action calls for them; recovery must continue the preceding effect's decay.
- Inspect the sequence midpoint before replacing assets. Middle frames often reveal hidden discontinuity after a good-looking start and end.
- If fitting the source into the current frame size forces the important frame to shrink too much, prefer a modest frame contract expansion plus updated constants/docs over accepting a weak-looking asset. Keep gameplay hitboxes unchanged unless the user asks for behavior changes.
- Validate progression with alpha bboxes, not just visual preview: sizes and centers should evolve smoothly without sudden width/height collapse, anchor drift, or identity change.

## Frame Packing

Split the source by frame, preserve alpha margins, resize proportionally, and pad into the runtime frame size. Use custom source windows if generated spacing is uneven; windows must retain the full silhouette, weapon, trail, and particles. Use the shared workflow's chroma helper when transparency recovery is needed.

## Runtime Scale And Anchors

- Compare runtime-displayed alpha bbox size, not raw source size.
- Use the domain's actual rendering contract: `drawScale`, `anchorX`, `anchorY`, center drawing, baseline drawing, `visualY`, loop frames, or effect spawn offsets may differ by asset type.
- For actor sheets, compare displayed size against the nearest existing actor sprites in the same domain.
- For effect sheets, compare displayed size against the hitbox or visual target it represents, but do not change gameplay hitboxes unless requested.
- If only runtime size or placement is wrong, prefer adjusting draw scale or anchor constants over regenerating the art.
- When changing `frameW`, `frameH`, frame count, or draw scale, update all corresponding constants, loaders/catalogs, docs, and tests.

## Completion

The requested sheet or runtime configuration is integrated; frame dimensions/count/order, alpha margins, adjacent-frame continuity, displayed scale, and anchors match the consuming code. Update constants, catalogs, sprite docs, and affected tests when the contract changes.

Use [CODE_RULES validation tiers](../../../docs/CODE_RULES.md#分级验证): bitmap-only work needs asset checks; code changes add the corresponding code checks. Inspect files and static previews without starting the game or a headless browser.

Report final and source paths, the visual change or prompt summary, changed runtime constants, and validation results. Report any remaining visual uncertainty explicitly.
