import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const require = createRequire(import.meta.url);

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function assertFile(path) {
  const stats = statSync(join(root, path));
  assert.ok(stats.isFile(), `${path} must exist`);
  assert.ok(stats.size > 0, `${path} must not be empty`);
}

async function request(server, path) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  const body = await response.arrayBuffer();
  return {
    bodyBytes: body.byteLength,
    contentType: response.headers.get("content-type") || "",
    status: response.status,
  };
}

function createStaticServer() {
  return createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const map = {
      "/": "index.html",
      "/index.html": "index.html",
      "/version.json": "version.json",
      "/robots.txt": "robots.txt",
      "/sitemap.xml": "sitemap.xml",
      "/site.webmanifest": "site.webmanifest",
      "/privacy": "privacy.html",
      "/privacy.html": "privacy.html",
      "/assets/favicon.png": "assets/favicon.png",
      "/assets/hero-dossier.png": "assets/hero-dossier.png",
    };
    const file = map[url.pathname];
    if (!file) {
      res.writeHead(404).end("not found");
      return;
    }
    const contentTypes = {
      ".html": "text/html",
      ".json": "application/json",
      ".png": "image/png",
      ".txt": "text/plain",
      ".xml": "application/xml",
      ".webmanifest": "application/manifest+json",
    };
    const ext = file.slice(file.lastIndexOf("."));
    res.writeHead(200, { "content-type": contentTypes[ext] || "application/octet-stream" });
    res.end(readFileSync(join(root, file)));
  });
}

async function verifyStaticServer() {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    for (const path of [
      "/",
      "/index.html",
      "/version.json",
      "/robots.txt",
      "/sitemap.xml",
      "/site.webmanifest",
      "/privacy",
      "/assets/favicon.png",
      "/assets/hero-dossier.png",
    ]) {
      const result = await request(server, path);
      assert.equal(result.status, 200, `${path} must return HTTP 200`);
      assert.ok(result.bodyBytes > 0, `${path} must return a non-empty body`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function verifyVersionApi() {
  const handler = require("../api/version.js");
  let statusCode = 0;
  let body = null;
  const headers = {};

  const res = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  handler({}, res);
  assert.equal(statusCode, 200, "/api/version must return HTTP 200");
  assert.ok(headers["cache-control"]?.includes("no-store"), "/api/version must disable caching");
  assert.equal(body.version, readJson("package.json").version, "/api/version must expose package version");
  assert.ok(Number.isInteger(body.revision), "/api/version must expose numeric revision");
}

// Edition-jurisdiction-purity guard (issue #442, child of #416).
// This is the Quebec (fr_CA) edition: the visitor-facing funnel copy must stay
// jurisdiction-pure and use Quebec-French (OQLF) vocabulary. We strip non-visible
// content (script/style blocks, HTML comments) so technical identifiers such as
// CSS class "copy-mail" or code comments mentioning "cookie" are not flagged.
function visibleCopy(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function verifyEditionPurity(html) {
  // 1. The edition must declare the Quebec locale, not a foreign one.
  assert.ok(html.includes('<html lang="fr">'), "edition purity: page language must be French (fr)");
  assert.ok(
    html.includes('content="fr_CA"'),
    "edition purity: og:locale must be fr_CA (Quebec edition)"
  );

  const copy = visibleCopy(html);

  // 2. Visitor-facing funnel copy must not surface cross-edition vocabulary.
  // Each entry: a foreign/international term that must NOT appear in visible copy,
  // and the Quebec-French term that replaces it.
  const forbiddenInCopy = [
    [/\bcookies?\b/i, "use the Quebec term \"temoin(s)\" instead of \"cookie(s)\""],
    [/\bspam\b/i, "use the Quebec term \"pourriel\" instead of \"spam\""],
    [/\bnewsletter\b/i, "use \"infolettre\"/\"liste de lancement\" instead of \"newsletter\""],
    [/\bcourrier[\s-]?electronique\b/i, "use the Quebec term \"courriel\""],
  ];
  for (const [pattern, guidance] of forbiddenInCopy) {
    assert.ok(
      !pattern.test(copy),
      `edition purity: visible funnel copy must stay Quebec-pure — ${guidance}`
    );
  }
}

function verifyFilesAndVersion() {
  const pkg = readJson("package.json");
  const version = readJson("version.json");
  const html = readText("index.html");

  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "package.json version must be semver");
  assert.equal(version.version, pkg.version, "version.json must match package.json");
  assert.ok(Number.isInteger(version.revision) && version.revision >= 1, "revision must be a positive integer");
  assert.match(version.lastUpdated, /^\d{4}-\d{2}-\d{2}$/, "lastUpdated must be YYYY-MM-DD");

  assert.ok(html.includes("<!DOCTYPE html>"), "index.html must declare a doctype");
  assert.ok(html.includes('<html lang="fr">'), "index.html must declare French as the primary language");
  assert.ok(html.includes(`data-site-version="${pkg.version}"`), "body must carry the current site version");
  assert.ok(html.includes(`id="site-version">v${pkg.version}`), "footer must show the current site version");
  assert.ok(html.includes('id="contact"'), "contact section must exist");
  assert.ok(html.includes('id="fallback-form"'), "email fallback form must exist");
  assert.ok(html.includes('id="consent-banner"'), "cookie consent banner must exist");
  assert.ok(html.includes('name="twitter:card"'), "twitter card metadata must exist");
  assert.ok(html.includes("application/ld+json"), "structured data (JSON-LD) must exist");
  assert.ok(html.includes('rel="manifest"'), "web manifest link must exist");
  assert.ok(!html.includes("A new version of the site is available"), "version banner must be localized (no English copy)");
  assert.ok(!/TODO|placeholder text|IMPLEMENTATION_\d+/.test(html), "index.html must not ship placeholders");

  verifyEditionPurity(html);

  const vercel = readJson("vercel.json");
  assert.ok(Array.isArray(vercel.headers), "vercel.json must define response headers");
  const hasCsp = vercel.headers.some((rule) =>
    (rule.headers || []).some((header) => header.key === "Content-Security-Policy")
  );
  assert.ok(hasCsp, "vercel.json must set a Content-Security-Policy header");

  const robots = readText("robots.txt");
  assert.ok(/Sitemap:\s*https:\/\/annoncedenounce\.com\/sitemap\.xml/.test(robots), "robots.txt must reference the sitemap");
  const sitemap = readText("sitemap.xml");
  assert.ok(sitemap.includes("https://annoncedenounce.com"), "sitemap.xml must list the canonical domain");

  for (const file of [
    ".github/workflows/autonomous-agent-loop.yml",
    ".github/workflows/autonomy-pr-review-gate.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/auto-version-bump.yml",
    ".github/workflows/tag-release.yml",
    "api/version.js",
    "assets/favicon.png",
    "assets/hero-dossier.png",
    "robots.txt",
    "sitemap.xml",
    "site.webmanifest",
    "privacy.html",
    "canon.lock.yaml",
    "docs/OPERATING_CANON.md",
  ]) {
    assertFile(file);
  }
}

verifyFilesAndVersion();
verifyVersionApi();
await verifyStaticServer();

console.log("verify-site: ok");
