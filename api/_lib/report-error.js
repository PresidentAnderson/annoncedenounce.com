// Lightweight, dependency-free error reporter for the static-site API routes.
//
// Forwards captured exceptions to whichever alert channels are configured via
// environment variables. Everything degrades gracefully: with no env vars set,
// it only logs to stderr so local/dev runs never crash on a missing transport.
//
//   SENTRY_DSN          Sentry DSN. When set, the event is sent to Sentry's
//                       Store API (no SDK / bundle required).
//   ALERT_WEBHOOK_URL   Generic JSON webhook (Slack-compatible: posts {text}).
//
// Returns a promise that always resolves so reporting can never take down a
// request handler.

function parseSentryDsn(dsn) {
  // https://<publicKey>@<host>/<projectId>
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return {
      publicKey: url.username,
      host: url.host,
      projectId,
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/store/`,
    };
  } catch {
    return null;
  }
}

async function sendToSentry(error, context) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return false;

  const payload = {
    event_id: globalThis.crypto?.randomUUID?.().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    server_name: process.env.VERCEL_REGION || "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    environment: process.env.VERCEL_ENV || "development",
    tags: { route: context.route || "unknown" },
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message || String(error),
        },
      ],
    },
    extra: context.extra || {},
  };

  const auth = [
    "Sentry sentry_version=7",
    "sentry_client=annoncedenounce-static/1.0",
    `sentry_key=${parsed.publicKey}`,
  ].join(", ");

  const response = await fetch(parsed.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": auth,
    },
    body: JSON.stringify(payload),
  });
  return response.ok;
}

async function sendToWebhook(error, context) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return false;

  const route = context.route || "unknown";
  const env = process.env.VERCEL_ENV || "development";
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);
  const text =
    `🚨 annoncedenounce API error on \`${route}\` (${env} @ ${commit})\n` +
    `${error.name || "Error"}: ${error.message || String(error)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return response.ok;
}

/**
 * Report an error to all configured channels. Never throws.
 * @param {unknown} error - the thrown value
 * @param {{route?: string, extra?: Record<string, unknown>}} [context]
 * @returns {Promise<{sentry: boolean, webhook: boolean}>}
 */
async function reportError(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  // Always surface to the platform log stream (picked up by Vercel logs).
  console.error(`[api:${context.route || "unknown"}]`, err);

  const results = await Promise.allSettled([
    sendToSentry(err, context),
    sendToWebhook(err, context),
  ]);

  return {
    sentry: results[0].status === "fulfilled" && results[0].value === true,
    webhook: results[1].status === "fulfilled" && results[1].value === true,
  };
}

module.exports = { reportError, parseSentryDsn };
