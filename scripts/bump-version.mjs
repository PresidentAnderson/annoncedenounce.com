import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const bump = process.argv[2] || "patch";
const allowed = new Set(["patch", "minor", "major"]);

assert.ok(allowed.has(bump), `bump must be one of: ${[...allowed].join(", ")}`);

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function writeJson(path, value) {
  writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
}

function nextVersion(current, kind) {
  const parts = current.split(".").map((part) => Number(part));
  assert.equal(parts.length, 3, "current version must be semver");
  assert.ok(parts.every(Number.isInteger), "current version must contain numeric semver parts");

  if (kind === "major") return `${parts[0] + 1}.0.0`;
  if (kind === "minor") return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

const pkg = readJson("package.json");
const release = readJson("version.json");
const lockPath = join(root, "package-lock.json");
let lock = null;

try {
  lock = JSON.parse(readFileSync(lockPath, "utf8"));
} catch (error) {
  lock = null;
}

assert.equal(release.version, pkg.version, "package.json and version.json must match before bumping");

const next = nextVersion(pkg.version, bump);
const today = new Date().toISOString().slice(0, 10);

pkg.version = next;
release.version = next;
release.revision = Number(release.revision || 0) + 1;
release.lastUpdated = today;

if (lock) {
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
}

let html = readFileSync(join(root, "index.html"), "utf8");
html = html.replace(/data-site-version="[^"]+"/, `data-site-version="${next}"`);
html = html.replace(/id="site-version">v\d+\.\d+\.\d+/, `id="site-version">v${next}`);

writeJson("package.json", pkg);
writeJson("version.json", release);
if (lock) writeJson("package-lock.json", lock);
writeFileSync(join(root, "index.html"), html);

console.log(`version bumped: v${next} (${bump}, revision ${release.revision})`);
