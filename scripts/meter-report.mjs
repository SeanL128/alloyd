#!/usr/bin/env node
// Generates the meter-spread experiment report from a meter-leg JSONL log.
// Usage: node scripts/meter-report.mjs [path/to/meter-leg.jsonl]
// Diffs before/after usage snapshots directly (the logged `delta` field is
// unreliable); drops scrapped, stale, and window-rollover rows.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const path = process.argv[2] ?? `${homedir()}/.claude/meter-leg.jsonl`;
const rows = readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);

// Max positive delta across windows sharing the same resetsAt; a window in
// `after` with no `before` counterpart means the window rolled over mid-leg.
function burn(row, side) {
  const before = row.before[side].windows, after = row.after[side].windows;
  let d = null, rolled = false;
  for (const w of after) {
    const m = before.find((x) => x.resetsAt === w.resetsAt);
    if (m) { const dd = w.usedPercent - m.usedPercent; if (d === null || dd > d) d = dd; }
    else rolled = true;
  }
  return { d: d ?? 0, rolled };
}

function exclusionReason(r) {
  if (r.scrapped || (r.notes ?? "").toUpperCase().includes("SCRAPPED")) return "scrapped";
  if (r.delta?.claude?.stale || r.delta?.codex?.stale) return "stale usage cache";
  if (burn(r, "claude").rolled || burn(r, "codex").rolled) return "window rollover";
  return null;
}

const excluded = [], usable = [];
for (const r of rows) {
  const reason = exclusionReason(r);
  (reason ? excluded : usable).push(reason ? { r, reason } : r);
}

function agg(rs) {
  const c = rs.reduce((s, r) => s + burn(r, "claude").d, 0);
  const x = rs.reduce((s, r) => s + burn(r, "codex").d, 0);
  const wu = rs.reduce((s, r) => s + Math.max(r.workUnits, 1), 0);
  const total = c + x;
  return {
    n: rs.length, wu,
    claude: c, codex: x,
    claudePerWU: wu ? c / wu : 0, codexPerWU: wu ? x / wu : 0,
    codexShare: total ? (100 * x) / total : 0,
  };
}

const buckets = [
  ["Control (all inline)", usable.filter((r) => r.arm === "control")],
  ["Routed, ≥1 dispatch", usable.filter((r) => r.arm === "routed" && r.dispatches > 0)],
  ["Routed, ≥2 dispatches", usable.filter((r) => r.arm === "routed" && r.dispatches >= 2)],
  ["Routed, 0 dispatches", usable.filter((r) => r.arm === "routed" && r.dispatches === 0)],
];

const f = (v) => v.toFixed(1);
const lines = [];
lines.push("# Meter-spread experiment report");
lines.push("");
lines.push(`Generated ${process.env.REPORT_DATE ?? new Date().toISOString().slice(0, 10)} from ${rows.length} logged sessions (${usable.length} usable, ${excluded.length} excluded).`);
lines.push("");
lines.push("## Method");
lines.push("");
lines.push("Real work sessions, each randomly assigned to an arm before starting:");
lines.push("**control** (all work inline on the driving CLI, no dispatching) or");
lines.push("**routed** (normal Alloy'd dispatching of substantial work units).");
lines.push("Usage snapshots of both providers' subscription meters were taken at");
lines.push("session start and end; burn is the diff between snapshots on matching");
lines.push("rate-limit windows (matched by reset timestamp). Percentages are of the");
lines.push("provider's own limit window (Claude Max 5x 5-hour window; Codex/ChatGPT");
lines.push("Plus weekly window). Sessions where a window rolled over mid-leg, the");
lines.push("usage cache went stale, or the session was scrapped are excluded.");
lines.push("");
lines.push("## Results");
lines.push("");
lines.push("| Arm | Sessions | Work units | Claude burn %/WU | Codex burn %/WU | Codex share of burn |");
lines.push("|---|---|---|---|---|---|");
for (const [label, rs] of buckets) {
  if (!rs.length) continue;
  const a = agg(rs);
  lines.push(`| ${label} | ${a.n} | ${a.wu} | ${f(a.claudePerWU)}% | ${f(a.codexPerWU)}% | ${f(a.codexShare)}% |`);
}
lines.push("");
lines.push("## Per-session data (usable rows)");
lines.push("");
lines.push("| Started | Arm | Difficulty | Driver | Dispatches | Work units | ΔClaude | ΔCodex |");
lines.push("|---|---|---|---|---|---|---|---|");
for (const r of usable) {
  lines.push(`| ${r.startedAt.slice(0, 16).replace("T", " ")} | ${r.arm} | ${r.difficulty ?? "?"} | ${r.model ?? "?"} | ${r.dispatches} | ${r.workUnits} | ${f(burn(r, "claude").d)}% | ${f(burn(r, "codex").d)}% |`);
}
lines.push("");
lines.push("## Excluded rows");
lines.push("");
for (const { r, reason } of excluded) lines.push(`- ${r.startedAt.slice(0, 16).replace("T", " ")} (${r.arm}): ${reason}`);
lines.push("");
lines.push("## Caveats");
lines.push("");
lines.push("- Small n throughout; the multi-dispatch bucket in particular rests on few sessions.");
lines.push("- Total burn per work unit is slightly higher when routed — expected: Alloy'd load-balances across two subscriptions, it does not reduce total compute.");
lines.push("- Meters are each provider's own reported usage; nothing is bypassed or estimated.");
lines.push("- Sessions were real day-to-day work across several projects, not a synthetic benchmark workload.");

process.stdout.write(lines.join("\n") + "\n");
