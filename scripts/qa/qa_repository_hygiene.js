"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const EXCLUDED_DIRS = new Set([".git", "node_modules", "Dades", "saves_web", "tmp"]);
const TEXT_EXTENSIONS = new Set([
  "", ".css", ".example", ".html", ".js", ".json", ".md", ".txt", ".yml", ".yaml",
]);
const forbiddenTrackedPaths = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)config\.js$/i,
  /(^|\/)(?:Dades|saves_web|node_modules|tmp)\//i,
  /\.(?:bak|key|log|old|orig|p12|pem|pfx|tmp)$/i,
];
const forbiddenContent = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { label: "provider credential", pattern: /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/ },
  { label: "personal absolute path", pattern: /(?:[A-Za-z]:\\Users\\[^\\\r\n]+|\/Users\/[^/\r\n]+|\/home\/[^/\r\n]+)/ },
  {
    label: "stale public identity",
    pattern: new RegExp([
      "joc", "rol\\.local|",
      "projecte", "-dm\\.onrender\\.com|",
      "X-Projecte", "-DM-UI",
    ].join(""), "i"),
  },
];

function normalized(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function walk(directory, prefix = "") {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...walk(path.join(directory, entry.name), relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

function repositoryFiles() {
  const result = spawnSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.split(/\r?\n/).filter(Boolean).map(normalized);
  }
  return walk(ROOT).map(normalized);
}

const files = repositoryFiles();
const failures = [];
let totalBytes = 0;

for (const relative of files) {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) continue;
  const stats = fs.statSync(absolute);
  totalBytes += stats.size;

  if (forbiddenTrackedPaths.some((pattern) => pattern.test(relative)) && relative !== ".env.example") {
    failures.push(`${relative}: forbidden repository path`);
  }

  if (!TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) continue;
  const content = fs.readFileSync(absolute, "utf8");
  for (const check of forbiddenContent) {
    if (check.pattern.test(content)) failures.push(`${relative}: ${check.label}`);
  }
}

if (failures.length) {
  console.error("# Repository hygiene: NO APTO");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("# Repository hygiene: APTO");
console.log(`Versioned files: ${files.length}`);
console.log(`Versioned bytes: ${totalBytes}`);
console.log("Secrets, personal paths, runtime state and stale public identities: none.");
