Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Runtime Restrictions

- Do not start headless browsers.
- Do not start game processes.
- When deleting files under `dist/assets`, run `npm run clean:dist-assets` instead of direct `rm` commands.

## 6. Asset Generation

- All generated image assets must be created with the `imagegen` skill/tool. Do not hand-roll raster assets with scripts or code-native drawing as a substitute for image generation.
- Do not assume `imagegen` wrote files to disk. Inspect the tool response first: built-in image generation returns PNG base64 in `image_generation_call.result`; decode that result explicitly and save it into the workspace before post-processing.
- Treat generated image dimensions, mode, and transparency as untrusted. Before replacing an asset, validate exact width/height, alpha channel, transparent edges, and any runtime bbox expected by the existing asset.
- Deterministic post-processing is allowed only for file handling, transparency recovery, cropping, scaling, compression, and validation. Do not use scripts to invent or repaint the image content.
- Use the Image Gen CLI fallback only when explicitly needed and after checking the environment supports it; missing `OPENAI_API_KEY` means the built-in tool output must be used instead of pretending the CLI path worked.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
