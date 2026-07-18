import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Verified by piping a statusline fixture; kept dependency-free on purpose.
// When setup wraps a pre-existing statusline, its command arrives base64-encoded
// after --wrap and its output is what the user sees; alloyd's own line is only
// the fallback for users who had no statusline (or when the wrapped one fails).
let status = "alloyd";
let input = "";
let wrappedOutput = null;

try {
  input = readFileSync(0, "utf8");
} catch {
  // No stdin — render the fallback label.
}

// Snapshot the cache BEFORE the wrapped statusline runs: if it also writes
// ~/.claude/usage-status.json (some custom statuslines do), it would both
// destroy the merge baseline and need alloyd's merged write to come after it.
const cachePath = join(homedir(), ".claude", "usage-status.json");
let cachedTop = null;
let cachedBefore = null;
try {
  const parsed = JSON.parse(readFileSync(cachePath, "utf8"));
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    cachedTop = parsed;
    cachedBefore = parsed.rate_limits ?? null;
  }
} catch {
  // No readable cache — nothing to merge against.
}

const wrapIndex = process.argv.indexOf("--wrap");
if (wrapIndex !== -1 && process.argv[wrapIndex + 1]) {
  try {
    const original = Buffer.from(process.argv[wrapIndex + 1], "base64").toString("utf8");
    const child = spawnSync(original, { shell: true, input, encoding: "utf8", timeout: 5000 });
    if (child.status === 0 && typeof child.stdout === "string" && child.stdout.trim().length > 0) {
      wrappedOutput = child.stdout;
    }
  } catch {
    // Fall through to alloyd's own status line.
  }
}

try {
  const payload = JSON.parse(input);
  const rateLimits = payload?.rate_limits;

  if (rateLimits) {
    for (const window of Object.values(rateLimits)) {
      if (window && typeof window === "object" && typeof window.resets_at === "string") {
        window.resets_at = Date.parse(window.resets_at) / 1000;
      }
    }

    const dir = join(homedir(), ".claude");

    // An idle Claude Code window can re-render an hours-old payload and clobber
    // fresher data (last-writer-wins). Usage within one reset window only rises,
    // so on a matching resets_at keep the higher percentage; an incoming
    // resets_at OLDER than the cached one is a stale previous-window payload and
    // the cached entry is kept wholesale. Only a strictly newer resets_at
    // replaces the window. Merged against the pre-run snapshot (see above).
    // Additive: cached windows the incoming payload doesn't mention are kept,
    // and unknown top-level cache keys other tools stored survive the rewrite.
    if (cachedBefore && typeof cachedBefore === "object") {
      for (const [key, prior] of Object.entries(cachedBefore)) {
        if (!(key in rateLimits)) rateLimits[key] = prior;
      }
    }
    for (const [key, window] of Object.entries(rateLimits)) {
      const prior = cachedBefore?.[key];
      if (
        window && typeof window === "object" && prior && typeof prior === "object" &&
        typeof prior.resets_at === "number" && typeof window.resets_at === "number"
      ) {
        if (prior.resets_at > window.resets_at) {
          rateLimits[key] = prior;
        } else if (
          prior.resets_at === window.resets_at &&
          typeof prior.used_percentage === "number" && typeof window.used_percentage === "number" &&
          prior.used_percentage > window.used_percentage
        ) {
          window.used_percentage = prior.used_percentage;
        }
      }
    }

    const meters = [];
    if (typeof rateLimits.five_hour?.used_percentage === "number") meters.push(`5h ${Math.round(rateLimits.five_hour.used_percentage)}%`);
    if (typeof rateLimits.seven_day?.used_percentage === "number") meters.push(`7d ${Math.round(rateLimits.seven_day.used_percentage)}%`);
    if (meters.length > 0) status = `alloyd ✓ ${meters.join(" · ")}`;

    const temp = join(dir, `usage-status.${process.pid}.${Date.now()}.tmp`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(temp, JSON.stringify({ ...cachedTop, ts: Math.floor(Date.now() / 1000), rate_limits: rateLimits }));
    renameSync(temp, cachePath);
  }
} catch {
  // Statusline integration must never interrupt Claude Code.
}

if (wrappedOutput !== null) {
  process.stdout.write(wrappedOutput);
} else {
  console.log(status);
}
