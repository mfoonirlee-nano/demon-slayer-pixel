import tinify from "tinify";
import { readFileSync, statSync, readdirSync } from "fs";
import { join } from "path";

const envPath = new URL("../.env", import.meta.url).pathname;
const envContent = readFileSync(envPath, "utf-8");
const apiKey = envContent.match(/TINYPNG_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("TINYPNG_API_KEY not found in .env");
  process.exit(1);
}

tinify.key = apiKey;

function findPngs(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findPngs(full));
    else if (entry.name.endsWith(".png")) results.push(full);
  }
  return results;
}

const files = findPngs("assets");

if (files.length === 0) {
  console.log("No PNG files found.");
  process.exit(0);
}

console.log(`Found ${files.length} PNG files, compressing...\n`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const before = statSync(file).size;
  try {
    await tinify.fromFile(file).toFile(file);
    const after = statSync(file).size;
    const saved = (((before - after) / before) * 100).toFixed(1);
    totalBefore += before;
    totalAfter += after;
    console.log(`✓ ${file.padEnd(45)} ${kb(before)} → ${kb(after)}  (-${saved}%)`);
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
  }
}

const totalSaved = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1);
console.log(`\nTotal: ${kb(totalBefore)} → ${kb(totalAfter)}  (-${totalSaved}%)`);

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`.padStart(8);
}
