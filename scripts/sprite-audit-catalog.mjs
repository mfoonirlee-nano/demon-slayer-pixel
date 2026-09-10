import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const modules = new Map();
const sourceFiles = new Map();

export function numericProperty(relativePath, constant, property, fallback) {
  if (!sourceFiles.has(relativePath)) {
    sourceFiles.set(relativePath, ts.createSourceFile(relativePath, readFileSync(relativePath, "utf8"), ts.ScriptTarget.Latest, true));
  }
  let result = fallback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText() === constant) {
      let value = node.initializer;
      while (ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression;
      const field = value.properties?.find((item) => item.name?.getText() === property);
      if (field) {
        if (!ts.isNumericLiteral(field.initializer)) throw new Error(`Non-numeric ${constant}.${property}`);
        result = Number(field.initializer.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFiles.get(relativePath));
  return result;
}

// Evaluate only local configuration modules; no browser, asset loading or game loop.
export function loadConfiguration(relativePath) {
  const filename = path.resolve(process.cwd(), relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireLocal = (specifier) => {
    if (!specifier.startsWith(".")) throw new Error(`Non-local configuration import: ${specifier}`);
    const base = path.resolve(path.dirname(filename), specifier);
    const resolved = [base, `${base}.ts`, `${base}.js`, path.join(base, "index.ts")]
      .find((candidate) => existsSync(candidate) && path.extname(candidate));
    if (!resolved) throw new Error(`Unresolved configuration import: ${specifier}`);
    return loadConfiguration(resolved);
  };
  runInNewContext(source, { module, exports: module.exports, require: requireLocal }, { filename });
  return module.exports;
}

export function spriteCatalog() {
  const catalog = new Map();
  function visit(value, binding) {
    if (!value || typeof value !== "object") return;
    const count = value.count ?? value.frameCount;
    if (value.src && value.frameW && value.frameH && count) {
      const existing = catalog.get(value.src);
      if (existing) {
        if (existing.frameW !== value.frameW || existing.frameH !== value.frameH || existing.count !== count) {
          throw new Error(`Conflicting sprite contracts: ${value.src}`);
        }
        existing.bindings.push(binding);
      } else {
        const { src, frameW, frameH, drawW, drawH, drawScale, anchorX, anchorY, animSpeed } = value;
        catalog.set(src, { src, frameW, frameH, count, drawW, drawH, drawScale, anchorX, anchorY, animSpeed, bindings: [binding] });
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${binding}.${key}`);
  }
  visit(loadConfiguration("src/constants/assets.ts"), "assets");
  return catalog;
}
