/* global console, fetch, AbortSignal */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { loadEnv } from "vite";

const env = { ...process.env, ...loadEnv("production", process.cwd(), "CLOUDFLARE_") };
const projectName = env.CLOUDFLARE_PAGES_PROJECT_NAME || "moonlit-tide-survivor";
const DEFAULT_PRODUCTION_BRANCH = "main";
const REQUEST_TIMEOUT_MS = 30000;
const HTTP_NOT_FOUND = 404;

for (const key of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
  if (!env[key]?.trim()) throw new Error(`Missing ${key}; configure it in .env or the environment.`);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(projectName)) {
  throw new Error("CLOUDFLARE_PAGES_PROJECT_NAME must contain lowercase letters, digits and hyphens.");
}

const projectsUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/pages/projects`;
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.json();
  return { response, body };
}

const existing = await request(`${projectsUrl}/${encodeURIComponent(projectName)}`);
let project;
if (existing.body.success) {
  project = existing.body.result;
} else if (existing.response.status === HTTP_NOT_FOUND) {
  const created = await request(projectsUrl, {
    method: "POST",
    body: JSON.stringify({ name: projectName, production_branch: DEFAULT_PRODUCTION_BRANCH }),
  });
  if (!created.body.success) throw new Error(`Cannot create Pages project: ${JSON.stringify(created.body.errors)}`);
  project = created.body.result;
} else {
  throw new Error(`Cannot access Pages project: ${JSON.stringify(existing.body.errors)}`);
}

const deployment = spawnSync("pnpm", [
  "exec", "wrangler", "pages", "deploy", ".cloudflare/site",
  "--project-name", projectName,
  "--branch", project.production_branch,
  "--commit-dirty=true",
], { stdio: "inherit", env: { ...env, WRANGLER_SEND_METRICS: "false" } });
if (deployment.error) throw deployment.error;
if (deployment.status !== 0) process.exit(deployment.status ?? 1);
console.log(`Production site: https://${project.subdomain}`);
