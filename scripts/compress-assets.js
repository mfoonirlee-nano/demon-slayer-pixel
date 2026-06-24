/* global console */
import tinify from "tinify";
import { readFileSync, statSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

const envPath = new URL("../.env", import.meta.url).pathname;
const envContent = readFileSync(envPath, "utf-8");
const apiKey = envContent.match(/TINYPNG_API_KEY=(.+)/)?.[1]?.trim();
const PERCENT_SCALE = 100;
const LOG_FILE_COLUMN_WIDTH = 45;
const BYTES_PER_KIB = 1024;
const SIZE_COLUMN_WIDTH = 8;

if (!apiKey) {
  console.error("TINYPNG_API_KEY not found in .env");
  process.exit(1);
}

tinify.key = apiKey;

const files = process.argv.slice(2).filter((f) => f.endsWith(".png"));

if (files.length === 0) {
  console.log("No PNG files to compress.");
  process.exit(0);
}

console.log(`Compressing ${files.length} PNG file(s)...\n`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const before = statSync(file).size;
  try {
    await tinify.fromFile(file).toFile(file);
    const after = statSync(file).size;
    const saved = (((before - after) / before) * PERCENT_SCALE).toFixed(1);
    totalBefore += before;
    totalAfter += after;
    console.log(`✓ ${file.padEnd(LOG_FILE_COLUMN_WIDTH)} ${kb(before)} → ${kb(after)}  (-${saved}%)`);
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
  }
}

const totalSaved = (((totalBefore - totalAfter) / totalBefore) * PERCENT_SCALE).toFixed(1);
console.log(`\nTotal: ${kb(totalBefore)} → ${kb(totalAfter)}  (-${totalSaved}%)`);

function kb(bytes) {
  return `${(bytes / BYTES_PER_KIB).toFixed(1)}KB`.padStart(SIZE_COLUMN_WIDTH);
}
