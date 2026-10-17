/* global console */
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const output = path.join(root, ".cloudflare", "site");
const MAX_FILE_BYTES = 26214400;
const MAX_FILE_COUNT = 20000;

async function checkFiles(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      count += await checkFiles(file);
    } else {
      if ((await stat(file)).size > MAX_FILE_BYTES) {
        throw new Error(`Cloudflare Pages file exceeds 25 MiB: ${path.relative(output, file)}`);
      }
      count += 1;
    }
  }
  return count;
}

// Keep dist/ and runtime assets as siblings so existing asset URLs still resolve.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "dist"), path.join(output, "dist"), { recursive: true });
await cp(path.join(root, "assets"), path.join(output, "assets"), {
  recursive: true,
  filter: (source) => path.basename(source) !== ".DS_Store",
});
await writeFile(path.join(output, "_redirects"), "/ /dist/ 302\n");
// A real 404 page disables Pages' implicit SPA fallback for missing images/audio.
await writeFile(path.join(output, "404.html"), "<!doctype html><title>404</title><h1>404</h1>\n");
const fileCount = await checkFiles(output);
if (fileCount > MAX_FILE_COUNT) {
  throw new Error(`Cloudflare Pages file limit exceeded: ${fileCount}`);
}
console.log(`Cloudflare package ready: .cloudflare/site (${fileCount} files).`);
