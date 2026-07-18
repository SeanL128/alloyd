#!/usr/bin/env node
import { readUsage } from "./pipeline.ts";
import { chooseDriver, type VendorUsage } from "./usage.ts";

function formatReset(resetsAt: number, now: number): string {
  const minutes = Math.max(0, Math.floor((resetsAt - now) / 60));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function fmt(u: VendorUsage, now: number): string {
  if (u.stale || u.windows.length === 0) return `${u.vendor}: unknown (stale/no data)`;
  const meters = u.windows
    .map((w) => `${Math.round(w.usedPercent)}%${w.resetsAt > 0 ? ` (resets in ${formatReset(w.resetsAt, now)})` : ""}`)
    .join(", ");
  return `${u.vendor}: ${meters} used`;
}

const now = Date.now() / 1000;
const { claude, codex } = readUsage({ probe: !process.argv.includes("--no-probe") });
const verdict = chooseDriver(claude, codex);

const json = process.argv.includes("--json");
if (json) {
  console.log(JSON.stringify({ claude, codex, verdict }, null, 2));
} else {
  console.log(fmt(claude, now));
  console.log(fmt(codex, now));
  console.log("");
  console.log(verdict.driver ? `→ drive with: ${verdict.driver}` : "→ no driver (no live data)");
  console.log(`  ${verdict.reason}`);
  if (verdict.warn) console.log(`  ⚠ ${verdict.warn}`);
}
