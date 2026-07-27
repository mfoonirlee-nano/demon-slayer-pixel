/* global console */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DIST_DIRECTORY = path.resolve(process.cwd(), "dist");
const DIST_BUILD_EXTENSIONS = new Set([".css", ".html", ".js", ".map"]);
const BUNDLE_EXTENSIONS = new Set([".css", ".js"]);
const INLINE_STATIC_ASSET_PATTERN = /data:(?:audio|font|image)\//;
const RELATIVE_SCRIPT_PATTERN = /<script[^>]+src="\.\/assets\/[^"]+\.js"/;
const RELATIVE_STYLESHEET_PATTERN = /<link[^>]+href="\.\/assets\/[^"]+\.css"/;

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(entryPath) : [entryPath];
  }));
  return files.flat();
}

const distFiles = await filesBelow(DIST_DIRECTORY);
const nonBuildFiles = distFiles.filter((file) => (
  !DIST_BUILD_EXTENSIONS.has(path.extname(file).toLowerCase())
));

if (nonBuildFiles.length > 0) {
  const relativeFiles = nonBuildFiles.map((file) => path.relative(process.cwd(), file));
  throw new Error(`Static assets must stay outside dist:\n${relativeFiles.join("\n")}`);
}

const bundleFiles = distFiles.filter((file) => (
  BUNDLE_EXTENSIONS.has(path.extname(file).toLowerCase())
));
const bundleSources = await Promise.all(bundleFiles.map((file) => readFile(file, "utf8")));

if (bundleSources.some((source) => INLINE_STATIC_ASSET_PATTERN.test(source))) {
  throw new Error("Static assets must not be inlined into dist bundles.");
}

const indexSource = await readFile(path.join(DIST_DIRECTORY, "index.html"), "utf8");
if (
  !RELATIVE_SCRIPT_PATTERN.test(indexSource)
  || !RELATIVE_STYLESHEET_PATTERN.test(indexSource)
) {
  throw new Error("dist/index.html must reference its JS and CSS bundles with relative paths.");
}

console.log("Verified dist contains relative code bundles without copied static assets.");
