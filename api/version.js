// Vercel serverless function: live-deployment version probe for static sites.
// Returns the deployed commit plus the canonical release metadata. Never cached.
const { reportError } = require("./_lib/report-error.js");

let packageInfo = {};
let releaseInfo = {};

try {
  packageInfo = require("../package.json");
} catch (error) {
  packageInfo = {};
}

try {
  releaseInfo = require("../version.json");
} catch (error) {
  releaseInfo = {};
}

module.exports = function handler(req, res) {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    res.status(200).json({
      commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      version: releaseInfo.version || packageInfo.version || "0.0.0",
      revision: releaseInfo.revision || 0,
      lastUpdated: releaseInfo.lastUpdated || null,
    });
  } catch (error) {
    // Surface unexpected failures to the alert channels, then 500.
    reportError(error, { route: "/api/version" });
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  }
};
