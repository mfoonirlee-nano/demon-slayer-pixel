import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const MAX_LINES = 600;
const ROOT_DIR = process.cwd();
const LINE_COUNT_PAD_WIDTH = 4;

const CHECKED_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);

const IGNORED_DIRECTORIES = new Set([".git", "assets", "dist", "node_modules"]);
const IGNORED_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);

function print(message) {
  process.stdout.write(`${message}\n`);
}

function printError(message) {
  process.stderr.write(`${message}\n`);
}

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
}

function shouldCheckFile(filePath) {
  const fileName = path.basename(filePath);
  return CHECKED_EXTENSIONS.has(path.extname(fileName)) && !IGNORED_FILES.has(fileName);
}

function countLines(content) {
  if (content.length === 0) {
    return 0;
  }

  const normalized = content.endsWith("\n") ? content.slice(0, -1) : content;
  return normalized.split(/\r\n|\r|\n/).length;
}

function walkDirectory(directory, files) {
  for (const entry of readdirSync(directory)) {
    if (IGNORED_DIRECTORIES.has(entry)) {
      continue;
    }

    const fullPath = path.join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath, files);
      continue;
    }

    if (stat.isFile() && shouldCheckFile(fullPath)) {
      files.push(fullPath);
    }
  }
}

const files = [];
walkDirectory(ROOT_DIR, files);

const violations = files
  .map((filePath) => ({
    lineCount: countLines(readFileSync(filePath, "utf8")),
    path: relativePath(filePath),
  }))
  .filter((file) => file.lineCount > MAX_LINES)
  .sort((a, b) => b.lineCount - a.lineCount);

if (violations.length > 0) {
  printError(`Line limit exceeded: files must be ${MAX_LINES} lines or fewer.`);

  for (const violation of violations) {
    printError(`${violation.lineCount.toString().padStart(LINE_COUNT_PAD_WIDTH, " ")} ${violation.path}`);
  }

  process.exitCode = 1;
} else {
  print(`Line limit ok: ${files.length} files checked, max ${MAX_LINES} lines.`);
}
