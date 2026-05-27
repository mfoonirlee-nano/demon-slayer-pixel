/* global console */
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const target = path.resolve(root, "dist", "assets");
const allowedRoot = path.resolve(root, "dist") + path.sep;

if (!target.startsWith(allowedRoot)) {
  throw new Error(`Refusing to clean outside dist: ${target}`);
}

let entries;
try {
  entries = await readdir(target, { withFileTypes: true });
} catch (error) {
  if (error.code === "ENOENT") {
    console.log("No dist/assets directory to clean.");
    process.exit(0);
  }
  throw error;
}

await Promise.all(
  entries.map((entry) => rm(path.join(target, entry.name), { recursive: true, force: true })),
);

console.log(`Removed ${entries.length} item(s) from dist/assets.`);
