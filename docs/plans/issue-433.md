# Plan — Issue #433: Backup + tested restore drill (child of #415, also #71)

**Status:** PLAN (cross-repo blocker — see "Why this is a plan, not an implementation").
**Source issue:** `PresidentAnderson/juge.ca#433` (labels: `ops`, `priority:critical`).
**Acceptance (from the issue):** a restore drill passes from a real backup, end-to-end,
documented — i.e. a *scripted* restore of a real backup into a scratch project that
verifies row counts + integrity, plus a documented runbook.

---

## Why this is a plan, not an implementation

The orchestrator placed this task in the **`annoncedenounce.com`** worktree, but issue
#433 belongs to the **`juge.ca`** repository:

- The issue references `docs/SUPABASE_RECOVERY_RUNBOOK.md`, the Supabase Postgres
  database, the `evidence` storage bucket, `legal_holds`, `audit_chain_events`, and the
  `verify:rls` / `verify:rls-isolation` scripts — **all of which live in `juge.ca`**.
- `annoncedenounce.com` is a **static launch site** (`index.html`, `privacy.html`, a
  small `scripts/` of site helpers). It has **no database, no Supabase, no migrations**.
  Shipping a Postgres restore-drill script here would put irrelevant code in the wrong
  repo, violating the "touch only files relevant to this issue" rule.
- The shared `node_modules` symlink points at `juge.ca`, confirming juge.ca is the
  intended codebase — but the git worktree is annoncedenounce.com, so a PR from here
  can only land in annoncedenounce.com. Writing directly into the live `juge.ca`
  checkout is out of scope (it is a separate working copy with its own autonomy loop).

Therefore this PR carries a **complete, drop-in implementation plan** (with concrete,
convention-matching code) so a maintainer can apply it to `juge.ca` in one pass, and so
the issue has an associated PR. The PR references the issue with `Refs #433` rather than
`Closes #433`, because a PR in this repo cannot close an issue in another repo.

## Current state in juge.ca (already done)

- `docs/BACKUP_RESTORE_RUNBOOK.md` exists and documents: what to back up (Postgres +
  `evidence` bucket), the backup paths (Supabase PITR primary; `pg_dump -Fc` secondary),
  and a **manual** tested-restore drill procedure.
- Verify scripts exist and are the integrity oracle: `scripts/verify-rls.mjs`
  (`npm run verify:rls`) and `scripts/verify-rls-isolation.mjs`
  (`npm run verify:rls-isolation`), plus `scripts/apply-migrations.mjs` for schema
  rebuild. Shared helper: `scripts/load-env-file.mjs`.

**Gap = the actual #433 deliverable:** the drill is documented but **not scripted**. The
acceptance asks for a *scripted* restore that verifies row counts + integrity. That
single script does not exist yet.

---

## Scope

In scope (for the juge.ca change this plan describes):
- One new script `scripts/restore-drill.mjs` that automates: take/locate a dump →
  restore into a **scratch** DB → run integrity verifications → spot-check row counts →
  print a dated PASS/FAIL summary. **Never touches prod**; refuses to run if the scratch
  URL looks like the prod URL.
- An `npm` script alias `drill:restore`.
- A short "Run the scripted drill" section appended to `docs/BACKUP_RESTORE_RUNBOOK.md`,
  and a back-reference from `docs/SUPABASE_RECOVERY_RUNBOOK.md`.

Out of scope: changing migrations, RLS, legal-hold logic, or any prod data path;
automating evidence-bucket mirroring (note it, leave manual for now); CI scheduling.

---

## Sub-task checklist

- [ ] Add `scripts/restore-drill.mjs` (Node ESM, matches `verify-rls.mjs` conventions:
      `loadEnvFile()`, `pg`, skip-cleanly-when-no-URL, never print connection strings).
- [ ] Inputs via env, never args-with-secrets:
      `DRILL_SCRATCH_URL` (required; the scratch/local Postgres) and `DRILL_DUMP_FILE`
      (path to an existing `-Fc` dump; if absent and `DRILL_ALLOW_DUMP=1`, create a fresh
      dump from `POSTGRES_URL_NON_POOLING` into a temp file).
- [ ] **Prod guard:** abort if `DRILL_SCRATCH_URL` equals or host-matches any of
      `POSTGRES_URL_NON_POOLING` / `POSTGRES_URL` / `SUPABASE_DB_URL`. This is the single
      most important safety rule — a drill must be impossible to point at prod.
- [ ] Restore step: shell out to `pg_restore --no-owner --no-privileges --clean
      --if-exists -d "$DRILL_SCRATCH_URL" <dump>`; capture rc; treat benign
      "already exists"/role notices as non-fatal, real errors as FAIL.
- [ ] Integrity step: run `verify:rls` and `verify:rls-isolation` **against the scratch
      DB** by spawning them with `POSTGRES_URL_NON_POOLING=$DRILL_SCRATCH_URL` in the
      child env (reuse the existing oracles; don't reimplement).
- [ ] Row-count step: `select count(*)` for `matters`, `audit_chain_events`,
      `legal_holds` (the compliance-critical tables); assert > 0 (configurable minimums)
      and print the counts.
- [ ] Output: a dated `RESTORE DRILL <date>: PASS/FAIL` block with per-check lines;
      non-zero exit on any FAIL so it is CI-usable later.
- [ ] Cleanup: remove any temp dump it created; never leave secrets on disk.
- [ ] `package.json`: add `"drill:restore": "node scripts/restore-drill.mjs"`.
- [ ] Docs: append "## Run the scripted drill" to `docs/BACKUP_RESTORE_RUNBOOK.md` with
      the exact env vars + example invocation; cross-link from the recovery runbook.
- [ ] Validate: `node_modules/.bin/tsc --noEmit` adds no new errors; run the drill once
      against a local scratch Postgres to confirm it passes end-to-end, and record that
      run (date + outcome) in the runbook — this is the literal acceptance criterion.

## Proposed script skeleton (drop-in for juge.ca `scripts/restore-drill.mjs`)

```js
// Scripted, prod-safe tested-restore drill (#433). Restores a real -Fc dump into a
// SCRATCH database, then proves integrity (RLS oracles) + non-empty compliance tables.
// Never touches prod: aborts if the scratch URL matches any prod URL. Never prints
// connection strings. Non-zero exit on any failure so it is CI-usable.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { loadEnvFile } from "./load-env-file.mjs";

loadEnvFile();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const scratch = process.env.DRILL_SCRATCH_URL;
if (!scratch) { console.log("→ restore-drill: no DRILL_SCRATCH_URL; skipping."); process.exit(0); }

const prodUrls = [process.env.POSTGRES_URL_NON_POOLING, process.env.POSTGRES_URL, process.env.SUPABASE_DB_URL]
  .filter(Boolean);
const hostOf = (u) => { try { return new URL(u).host; } catch { return u; } };
if (prodUrls.some((u) => u === scratch || hostOf(u) === hostOf(scratch))) {
  console.error("✗ restore-drill: DRILL_SCRATCH_URL matches a prod URL — refusing."); process.exit(2);
}

// 1) Locate/create the dump.
let dump = process.env.DRILL_DUMP_FILE, tmp;
if (!dump) {
  if (process.env.DRILL_ALLOW_DUMP !== "1") { console.error("✗ no DRILL_DUMP_FILE and DRILL_ALLOW_DUMP!=1"); process.exit(2); }
  tmp = mkdtempSync(join(tmpdir(), "drill-")); dump = join(tmp, "backup.dump");
  const src = process.env.POSTGRES_URL_NON_POOLING;
  const d = spawnSync("pg_dump", [src, "--no-owner", "--no-privileges", "-Fc", "-f", dump], { stdio: ["ignore","inherit","inherit"] });
  if (d.status !== 0) { console.error("✗ pg_dump failed"); process.exit(1); }
}
if (!existsSync(dump)) { console.error("✗ dump file not found"); process.exit(1); }

const fails = [];
// 2) Restore into scratch.
const r = spawnSync("pg_restore", ["--no-owner","--no-privileges","--clean","--if-exists","-d",scratch,dump], { stdio: ["ignore","inherit","inherit"] });
if (r.status !== 0) fails.push("pg_restore"); // pg_restore is noisy; treat non-zero as a soft signal, rely on checks below

// 3) Integrity oracles against scratch.
for (const s of ["verify:rls", "verify:rls-isolation"]) {
  const v = spawnSync("npm", ["run", s], { stdio: "inherit", env: { ...process.env, POSTGRES_URL_NON_POOLING: scratch } });
  if (v.status !== 0) fails.push(s);
}

// 4) Row counts on compliance-critical tables.
const c = new pg.Client({ connectionString: scratch, ssl: { rejectUnauthorized: false } });
await c.connect();
for (const t of ["matters", "audit_chain_events", "legal_holds"]) {
  const { rows } = await c.query(`select count(*)::int n from ${t}`);
  const ok = rows[0].n > 0; console.log(`${ok ? "✓" : "✗"} rows in ${t}: ${rows[0].n}`);
  if (!ok) fails.push(`rows:${t}`);
}
await c.end();
if (tmp) rmSync(tmp, { recursive: true, force: true });

const date = new Date().toISOString().slice(0, 10);
console.log(`\nRESTORE DRILL ${date}: ${fails.length ? "FAIL (" + fails.join(", ") + ")" : "PASS"}`);
process.exit(fails.length ? 1 : 0);
```

> Note: `pg_restore`'s exit status is noisy (it returns non-zero on benign role/owner
> notices even with `--no-owner`). The integrity oracles + row counts are the real gate;
> when implementing, downgrade a non-zero `pg_restore` to a warning and let the checks
> decide PASS/FAIL, or parse its stderr for genuinely fatal lines.

---

## Human / architecture / counsel decisions required

1. **Scratch target.** Provision a dedicated throwaway Supabase project for drills, or
   standardise on local Postgres in CI? (Affects whether storage-bucket restore can be
   exercised at all.) — *infra/architecture decision.*
2. **Real backup access for the drill.** Who holds the encrypted off-Supabase dump, and
   how does the drill operator obtain a *real* (not synthetic) backup without exposing
   PII/evidence metadata? — *security + counsel decision* (legal data minimisation).
3. **Evidence bucket in scope?** The acceptance says "a real backup… end-to-end."
   Decide whether the drill must also restore + verify the `evidence` storage bucket, or
   whether Postgres-only satisfies #433 with bucket mirroring tracked separately.
4. **Cadence + ownership.** Quarterly + post-major-migration is proposed; confirm and
   assign an owner. Optionally wire a scheduled CI job (out of scope here).
5. **Retention/PITR confirmation.** Confirm PITR is actually enabled and record the
   window (the runbook says "confirm" — that confirmation is a human step).

## First safe slice

Land `scripts/restore-drill.mjs` + the `drill:restore` npm alias + the runbook section,
**guarded to skip cleanly when `DRILL_SCRATCH_URL` is unset** and **hard-refusing to run
against any prod URL**. This adds zero risk to prod (no prod write path, skips by default)
and immediately enables an operator to run a real end-to-end drill against a scratch DB
and record the dated PASS — satisfying the acceptance criterion — without first resolving
the larger infra/counsel questions above.
```
