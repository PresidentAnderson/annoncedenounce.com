// Vercel serverless function: liveness/health probe for uptime monitoring.
//
// GET /api/health
//   -> 200 { status: "ok", commit, env, ts }
//
// GET /api/health?synthetic=error
//   -> deliberately throws so the error-reporting + alert pipeline can be
//      exercised end-to-end (acceptance: "a synthetic error fires an alert").
//      Responds 500 after dispatching the alert.
const { reportError } = require("./_lib/report-error.js");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.searchParams.get("synthetic") === "error") {
      throw new Error("synthetic health-check error (intentional)");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    res.status(200).json({
      status: "ok",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      env: process.env.VERCEL_ENV || "development",
      ts: new Date().toISOString(),
    });
  } catch (error) {
    await reportError(error, { route: "/api/health" });
    if (!res.headersSent) {
      res.status(500).json({ status: "error", error: "internal_error" });
    }
  }
};
