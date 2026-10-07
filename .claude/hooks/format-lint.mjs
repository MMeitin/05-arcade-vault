import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const file = input.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const root = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const abs = path.resolve(file);
const rel = path.relative(root, abs);
if (rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0);
if (/(^|[\/])(node_modules|\.next|references)[\/]/.test(rel)) process.exit(0);

const ext = path.extname(abs).toLowerCase();
const code = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const docs = [".md", ".mdx"];
if (![...code, ...docs].includes(ext)) process.exit(0);

const run = (args) =>
  spawnSync("npx", ["--no-install", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

const prettier = run(["prettier", "--write", `"${abs}"`]);
if (prettier.status !== 0) {
  console.error(prettier.stderr || prettier.stdout);
  process.exit(2);
}

if (code.includes(ext)) {
  const lint = run(["eslint", "--fix", `"${abs}"`]);
  if (lint.status !== 0) {
    console.error(lint.stdout || lint.stderr);
    process.exit(2);
  }
}
process.exit(0);
