# Notes

## Canonical Terms

- Combat actor: any runtime body that represents a player character, enemy, or Boss across animation states.
- Character-state visual unification: the workflow of making a combat actor read as the same identity across its idle/move/attack/cast/recover/death/etc. sprite sheets.
- Identity baseline: the reference for a combat actor's stable silhouette, palette, costume/body landmarks, weapon or core prop, and material language.
- Project-bound image asset: any generated or edited bitmap that will be referenced from this repository, usually under `assets/`.
- Built-in imagegen: the `image_gen` tool available in Codex commentary. Its trusted artifacts are the PNG base64 in `image_generation_call.result`, or an exact generated-image file path explicitly provided by the current imagegen tool/developer output.
- Preview: an image rendered in the conversation. A preview is not a project file and must not be treated as an asset.
- Imagegen result: the PNG bytes decoded from `image_generation_call.result`.
- CLI fallback: `/Users/chris.li/.codex/skills/.system/imagegen/scripts/image_gen.py`. It is only usable when the environment has `OPENAI_API_KEY`.
- Default generated image directory: any `~/.codex/generated_images/` style location. Exact paths provided by the current imagegen output are trusted; directory scanning and "latest file" inference are not.
- Asset audit directory: `tmp/imagegen/`, where generated sources, alpha intermediates, backups, and repacked candidates are kept.

## Imagegen Rules Learned

- For project-bound image assets, do not scan default imagegen output directories to find "the latest" image.
- Do not report a generated preview as completed work.
- If the built-in imagegen output is needed, extract the current call's `image_generation_call.result` PNG base64, or copy the exact generated-image path explicitly provided for the current call, into `tmp/imagegen/`.
- If `image_generation_call.result` is not directly visible in the tool response, inspect the current Codex session JSONL for the current thread and the matching `image_generation_call` response item.
- If no result can be obtained and `OPENAI_API_KEY` is unavailable, stop with a precise blocker.
- Deterministic scripts may crop, scale, pad, quantize, remove chroma key, and validate. They must not invent or repaint image content.
- For transparent game assets, generate on a flat chroma-key background, remove it with the installed imagegen chroma helper, then validate alpha and frame margins before replacing the runtime asset.
