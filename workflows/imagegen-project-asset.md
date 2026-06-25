# Imagegen Project Asset Workflow

## Purpose

Generate or regenerate a project-bound bitmap asset without losing the actual image artifact, guessing from default output folders, or reporting a conversation preview as a committed asset.

This workflow fixes the failure mode from the vertical wave effect replacement: the agent used built-in imagegen correctly for generation, but initially failed to retrieve `image_generation_call.result` and incorrectly treated the preview as if it could not be saved.

## Trigger

Run this workflow when the user asks to create, regenerate, revise, or replace any bitmap asset in this repository, especially files under `assets/`.

Examples:

- "重新生成这个序列帧"
- "replace this skill effect"
- "generate an icon"
- "revise this sprite sheet"

## Scope

In scope:

- Built-in imagegen generation or editing.
- CLI fallback only when explicitly needed and `OPENAI_API_KEY` exists.
- Project-bound asset handling under the repository.
- Deterministic post-processing: chroma removal, transparency recovery, crop, scale, pad, frame packing, compression, and validation.

Out of scope:

- Scanning `~/.codex/generated_images/` or any default generated-image directory to infer the latest output.
- Repainting missing content with scripts.
- Changing gameplay, runtime constants, docs, or unrelated assets unless the user request requires it.
- Starting browsers or game processes.

## Inputs

The agent must establish these before replacing an asset:

- Target asset path.
- Whether the request is generate or edit.
- Runtime contract: total image size, frame count, per-frame width and height, alpha expectations, and any runtime constants.
- Relevant visual references from the repository or user-provided images.
- Whether the target file is already modified before the agent starts.

If a target file is already modified, treat it as user-owned work unless the user explicitly asked to replace that exact file.

## Non-Negotiable Artifact Rule

For built-in imagegen, the only trusted generated artifact is the PNG base64 in `image_generation_call.result`.

The agent must:

1. Decode `image_generation_call.result` into `tmp/imagegen/<asset>_source_from_result.png`.
2. Use that decoded file as the source for all post-processing.
3. Preserve source and intermediate files in `tmp/imagegen/`.

The agent must not:

- Scan default output folders for the newest generated file.
- Treat an inline preview as a saved file.
- Claim completion before the decoded result has been written and validated.

## Extracting The Built-In Result

Preferred path:

1. Read `image_generation_call.result` directly from the tool response object.
2. Base64-decode it into `tmp/imagegen/`.
3. Confirm the decoded file with `file` and an image dimension check.

Fallback path when the UI shows only an image preview:

1. Locate the current Codex thread id from `CODEX_THREAD_ID`.
2. Search the current Codex session JSONL for that thread under `/Users/chris.li/.codex/sessions/`.
3. Find the latest response item where `payload.type === "image_generation_call"` and `payload.result` is a PNG base64 string.
4. Decode that exact `payload.result` into `tmp/imagegen/`.
5. Do not print the base64 into the conversation or logs.

If no `image_generation_call.result` is available, the run is blocked unless CLI fallback is explicitly available.

## CLI Fallback

Use CLI fallback only when one of these is true:

- The user explicitly asks for CLI/API/model control.
- Built-in result extraction is unavailable and the user wants to proceed through CLI.
- Native transparency is required and the user confirms the `gpt-image-1.5` path.

Before running CLI fallback:

1. Check that `OPENAI_API_KEY` exists.
2. If it does not exist, stop and report the blocker.
3. Do not pretend the built-in preview was saved by the CLI.

## Execution Steps

1. Read applicable local instructions and sprite docs.
2. Inspect target asset and runtime constants.
3. State assumptions and success criteria.
4. Generate or edit with built-in imagegen.
5. Decode `image_generation_call.result` into `tmp/imagegen/`.
6. Inspect decoded source dimensions, mode, and visual contents.
7. If transparency is needed, remove chroma key with:

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

8. Repack the asset deterministically to the runtime contract.
9. Validate candidate dimensions, alpha, frame count, per-frame bbox, and edge margins.
10. Preview the candidate from the workspace path.
11. Replace only the requested asset.
12. Run the relevant project checks.

## Checkpoint

Push the checkpoint as far right as possible.

Ask the user only when one of these is true:

- The generated result cannot be extracted from `image_generation_call.result`.
- CLI fallback is needed but `OPENAI_API_KEY` is missing.
- The generated content fails visual requirements after one targeted retry.
- Replacing the asset would overwrite unrelated user changes.
- Runtime constants or gameplay behavior need to change.

The brief should include:

- The blocker or decision.
- The exact asset path.
- The candidate path if one exists.
- The recommended answer.

Recommended answer for missing result extraction:

"Stop. Do not scan generated image folders. Retry built-in imagegen or enable CLI fallback with `OPENAI_API_KEY`."

## Validation

For sprite sheets, validate:

- Total image dimensions exactly match the runtime contract.
- Frame count and per-frame dimensions match constants and docs.
- Every frame has non-empty alpha content.
- No frame bbox touches an edge unless the contract intentionally allows it.
- Transparent corners are actually transparent.
- The transition reads naturally across adjacent frames.

For this project, also run:

```bash
npm run typecheck
npm run lint
git diff --check
```

Do not start headless browsers or game processes.

## Done

The workflow run is done only when:

- The final asset is written at the requested project path.
- The decoded source and intermediates are preserved under `tmp/imagegen/`.
- Runtime contract validation passes.
- Required project checks pass or failures are clearly identified as unrelated.
- The final report names the final asset, intermediate files, prompt summary, runtime constant changes, and validation results.

## Failure Modes

If the agent cannot obtain `image_generation_call.result`, say:

"The built-in imagegen preview exists, but no trusted PNG artifact is available yet. I will not scan default generated-image directories. The run is blocked unless we retry built-in imagegen or use CLI fallback with `OPENAI_API_KEY`."

If `OPENAI_API_KEY` is missing, say:

"CLI fallback is unavailable because `OPENAI_API_KEY` is not set. The run remains blocked unless built-in `image_generation_call.result` can be extracted."
