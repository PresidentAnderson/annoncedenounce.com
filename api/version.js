// Vercel serverless function — live-deployment version probe for static sites.
// Returns the commit this deployment was built from (VERCEL_GIT_COMMIT_SHA,
// available at runtime). The inline notifier script records it on load and polls
// for a change. Never cached. CommonJS (these repos have no package.json).
module.exports = function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  res
    .status(200)
    .json({ commit: process.env.VERCEL_GIT_COMMIT_SHA || "local" });
};
