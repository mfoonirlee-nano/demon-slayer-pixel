# Repository Agent Instructions

Use these rules for work in this repository. Keep instructions and tool use lean: state each requirement once and preserve only constraints that affect the outcome.

## 1. Scope and Autonomy

- For requests to answer, explain, review, diagnose, or plan, inspect the relevant material and report the result. Edit files only when the request also asks for a change.
- For requests to change, build, or fix, make the requested in-scope local edits and run relevant non-destructive validation without asking first.
- Ask before external writes, destructive actions, purchases, or a material expansion of scope.
- When ambiguity is low-risk and reversible, state the assumption and proceed. Ask when a choice would materially change the result, scope, or safety.
- Surface a simpler approach or an important tradeoff when it would change the implementation decision.

## 2. Minimal, Surgical Changes

- Implement the minimum code that solves the request.
- Exclude unrequested features, single-use abstractions, speculative configurability, and handling for impossible scenarios.
- Match the existing style. Leave unrelated code, comments, formatting, and pre-existing dead code unchanged.
- Remove only imports, variables, functions, or files made unused by your changes.
- Every changed line must trace directly to the request.

## 3. Outcome and Verification

- Define verifiable success criteria before editing.
- For a bug, reproduce it with a focused test when practical. For a refactor, establish passing checks before and after. Add feature tests at a stable seam when one exists.
- For multi-step work, give a short plan in the form `step -> verification`.
- Run the narrowest relevant checks during implementation and the appropriate broader checks at the end. Continue until they pass or report a concrete blocker.
- Report the validation evidence; do not claim success without it.

## 4. Communication

- Lead with the conclusion or current outcome. Include supporting evidence, material caveats, and the next action when one exists.
- State each assumption or tradeoff once. Keep progress updates concise and omit repetition, generic reassurance, and optional background.

## 5. Runtime Restrictions

- Do not start headless browsers.
- Do not start game processes.
- When deleting files under `dist/assets`, run `npm run clean:dist-assets` instead of direct `rm` commands.

## 6. Asset Generation

- Create all generated image assets with the `imagegen` skill/tool. Scripts or code-native drawing are not substitutes for image generation.
- Trusted built-in imagegen artifacts are limited to PNG base64 from `image_generation_call.result` or an exact `~/.codex/generated_images/...` path provided by the current tool/developer output. Decode or copy that exact artifact into `tmp/imagegen/` or the target workspace path before post-processing. Never scan generated-image folders to infer the latest output.
- Treat generated dimensions, mode, and transparency as untrusted. Before replacing an asset, validate exact width and height, alpha channel, transparent edges, and any runtime bounding box expected by the existing asset.
- Limit deterministic post-processing to file handling, transparency recovery, cropping, scaling, compression, and validation. Do not use scripts to invent or repaint image content.
- Use the Image Gen CLI fallback only when explicitly needed and `OPENAI_API_KEY` is available. Without the key, use the built-in tool output.
