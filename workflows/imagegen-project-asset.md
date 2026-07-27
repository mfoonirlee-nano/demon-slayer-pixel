# Imagegen Project Asset Workflow

## Purpose

Create or revise a repository bitmap from a traceable Image Gen result while preserving the target asset's runtime contract and unrelated user work.

This workflow owns the generation, artifact extraction, deterministic post-processing, and validation procedure. [`docs/SPRITES.md`](../docs/SPRITES.md) owns runtime sprite specifications; [`docs/art/README.md`](../docs/art/README.md) routes to visual briefs.

## When to Use

Use it for any request to create, regenerate, edit, or replace bitmap content, especially under `assets/`. It covers built-in `imagegen`, an explicitly needed CLI fallback, and deterministic processing such as transparency recovery, crop, scale, pad, frame packing, compression, and validation.

## Required Inputs

Establish these facts before replacing an asset:

- Target asset path and whether the task is generation or editing.
- Runtime contract: exact total size, frame count and dimensions, alpha expectations, edge gutters, anchors, and related constants.
- Relevant repository or user-provided visual references.
- Current target dimensions, mode, alpha bbox, and worktree status.

If the target already contains user changes, preserve it unless the user explicitly put that exact replacement in scope.

## Artifact Contract

Create or edit bitmap content with the `imagegen` skill/tool. Scripts may perform only deterministic file handling, transparency recovery, cropping, scaling, padding, compression, and validation; they do not invent, repaint, or reconstruct visual content.

Trusted built-in artifacts are limited to:

- PNG base64 from the current call's `image_generation_call.result`.
- An exact `~/.codex/generated_images/...` path explicitly returned for the current call by the imagegen tool or developer output.

Materialize the trusted artifact before post-processing:

1. Decode the result into `tmp/imagegen/<asset>_source_from_result.png`, or copy the exact returned path to `tmp/imagegen/<asset>_source_from_generated_images.png`.
2. Verify the file type and dimensions.
3. Use this workspace copy as the source for every later step and preserve source/intermediate files under `tmp/imagegen/`.

An inline preview is not a saved artifact. Do not scan a default generated-image directory to infer the newest file.

If the UI exposes only a preview but the current tool response contains no accessible result, use `CODEX_THREAD_ID` to locate the current thread's session JSONL under the configured Codex home `sessions/` directory. Extract the current thread's latest `image_generation_call.result` without printing its base64. This recovers the trusted current-call result; it does not authorize selecting files from a generated-image directory.

If neither trusted source can be recovered, stop unless the CLI fallback below is both appropriate and available.

## CLI Fallback

Use the Image Gen CLI only when the user requests CLI/API/model control, built-in extraction is unavailable and the user wants that fallback, or the requested capability explicitly requires it. Confirm `OPENAI_API_KEY` is available before starting. Without the key, report the blocker and retain any valid built-in candidate.

## Procedure

1. Read the applicable sprite contract and visual brief.
2. Inspect the target asset, its runtime constants/manifest entries, and its worktree state.
3. State the intended visual change and measurable runtime contract.
4. Generate or edit with built-in `imagegen`, or use a permitted CLI fallback from the section above.
5. Materialize and verify one trusted artifact under `tmp/imagegen/`.
6. Inspect its visual content, dimensions, color mode, alpha, edge pixels, and per-frame bbox.
7. Apply only deterministic processing needed to meet the contract.
8. Preview the workspace candidate and compare it with the visual references and adjacent frames.
9. Replace only the requested asset. Update constants, manifest entries, or sprite docs only when the requested runtime contract changes.
10. Run the contract and repository checks below.

For chroma-key transparency recovery, use the maintained skill script:

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

## Validation

Validate every final candidate against the measured target contract:

- Exact file format, width, height, and color/alpha mode.
- Transparent corners and required edge gutters.
- Expected visible-content bbox and anchor alignment.
- Exact frame count and per-frame dimensions for sprite sheets.
- Non-empty alpha content in every frame.
- Adjacent-frame scale, continuity, and transition quality.
- Matching constants, manifest entries, and docs when the contract changed.

Run the checks selected by [`docs/CODE_RULES.md`](../docs/CODE_RULES.md), including `git diff HEAD --check`. Do not claim completion from a preview or from dimensions alone.

## Ask the User When

Pause only when:

- No trusted artifact can be recovered and no approved CLI fallback is available.
- CLI fallback is required but `OPENAI_API_KEY` is unavailable.
- One targeted regeneration still fails the visual requirement.
- Replacement would overwrite unrelated user changes.
- Success requires changing gameplay or a runtime contract outside the request.

Report the exact blocker, target path, available candidate path, and recommended next action.

## Done

The workflow is complete when:

- The final asset is written at the requested project path.
- Its trusted source and deterministic intermediates are preserved under `tmp/imagegen/`.
- Runtime contract validation passes.
- Relevant repository checks pass or unrelated failures are reported with evidence.
- The final report names the final asset, intermediate files, prompt summary, runtime constant changes, and validation results.
