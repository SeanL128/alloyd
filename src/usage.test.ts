import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseClaudeUsage,
  parseCodexUsage,
  isStale,
  chooseDriver,
  type VendorUsage,
} from "./usage.ts";

// Real shape captured from ~/.claude/usage-status.json
const CLAUDE_JSON = JSON.stringify({
  rate_limits: {
    five_hour: { used_percentage: 13, resets_at: 1784084400 },
    seven_day: { used_percentage: 54, resets_at: 1784458800 },
  },
  ts: 1784083558.406663,
});

// Real shape: newest rollout-*.jsonl, mixed event lines, last one carries rate_limits
const CODEX_JSONL = [
  JSON.stringify({ timestamp: "2026-07-14T20:00:00.000Z", type: "message", payload: { text: "hi" } }),
  JSON.stringify({
    timestamp: "2026-07-14T21:00:00.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      rate_limits: { primary: { used_percent: 90, window_minutes: 10080, resets_at: 1784666274 }, plan_type: "plus" },
    },
  }),
  // newest rate_limits line — this is the one that should win
  JSON.stringify({
    timestamp: "2026-07-14T21:20:59.260Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      rate_limits: { primary: { used_percent: 7, window_minutes: 10080, resets_at: 1784666274 }, plan_type: "plus" },
    },
  }),
  "", // trailing blank line, must not crash
].join("\n");

test("parseClaudeUsage extracts both windows and freshness ts", () => {
  const u = parseClaudeUsage(CLAUDE_JSON);
  assert.equal(u.vendor, "claude");
  assert.equal(u.freshnessTs, 1784083558.406663);
  assert.deepEqual(
    u.windows.map((w) => w.usedPercent).sort((a, b) => a - b),
    [13, 54],
  );
});

test("parseCodexUsage takes the LAST rate_limits line and ignores non-rate_limit lines", () => {
  const u = parseCodexUsage(CODEX_JSONL);
  assert.equal(u.vendor, "codex");
  assert.equal(u.windows.length, 1);
  assert.equal(u.windows[0].usedPercent, 7); // newest wins, not the 90
  // freshness from the ISO timestamp of that event, as epoch seconds
  assert.equal(u.freshnessTs, Date.parse("2026-07-14T21:20:59.260Z") / 1000);
});

test("parseCodexUsage turns an invalid timestamp into zero freshness and normalizes ISO resets", () => {
  const u = parseCodexUsage(JSON.stringify({
    timestamp: "not-a-date",
    payload: {
      rate_limits: {
        primary: { used_percent: 13, resets_at: "2026-07-14T23:30:00.000Z" },
      },
    },
  }));
  assert.equal(u.freshnessTs, 0);
  assert.equal(u.windows[0].resetsAt, Date.parse("2026-07-14T23:30:00.000Z") / 1000);
});

test("isStale is true past the TTL, false within it", () => {
  const now = 1784083558 + 5 * 60; // 5 min later
  assert.equal(isStale(1784083558, now, 10 * 60), false);
  assert.equal(isStale(1784083558, now + 6 * 60, 10 * 60), true); // 11 min later
});

test("chooseDriver picks the vendor with more headroom", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 54, resetsAt: 0 }], freshnessTs: 0 };
  const codex: VendorUsage = { vendor: "codex", windows: [{ usedPercent: 7, resetsAt: 0 }], freshnessTs: 0 };
  const v = chooseDriver(claude, codex);
  assert.equal(v.driver, "codex");
});

test("chooseDriver warns when both meters are hot", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 92, resetsAt: 0 }], freshnessTs: 0 };
  const codex: VendorUsage = { vendor: "codex", windows: [{ usedPercent: 85, resetsAt: 0 }], freshnessTs: 0 };
  const v = chooseDriver(claude, codex);
  assert.equal(v.driver, "codex"); // still more headroom
  assert.match(v.warn ?? "", /both/i);
});

test("chooseDriver falls back to the known vendor when the other is stale", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 54, resetsAt: 0 }], freshnessTs: 0, stale: true };
  const codex: VendorUsage = { vendor: "codex", windows: [{ usedPercent: 30, resetsAt: 0 }], freshnessTs: 0 };
  const v = chooseDriver(claude, codex);
  assert.equal(v.driver, "codex");
  assert.match(v.reason, /stale|unknown/i);
});

test("chooseDriver warns when its only known vendor has a hot meter", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 80, resetsAt: 0 }], freshnessTs: 0 };
  const codex: VendorUsage = { vendor: "codex", windows: [], freshnessTs: 0, stale: true };
  const v = chooseDriver(claude, codex);
  assert.equal(v.driver, "claude");
  assert.match(v.warn ?? "", /claude meter hot \(80%\).*unknown/i);
});

test("chooseDriver breaks rounded usage ties by the sooner tightest-meter reset", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 13.4, resetsAt: 200 }], freshnessTs: 0 };
  const codex: VendorUsage = { vendor: "codex", windows: [{ usedPercent: 13.49, resetsAt: 100 }], freshnessTs: 0 };
  const v = chooseDriver(claude, codex);
  assert.equal(v.driver, "codex");
  assert.equal(v.reason, "tie → codex resets sooner");
});

test("chooseDriver defaults to claude on an exact usage and reset tie", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 13, resetsAt: 100 }], freshnessTs: 0 };
  const codex: VendorUsage = { vendor: "codex", windows: [{ usedPercent: 13, resetsAt: 100 }], freshnessTs: 0 };
  const v = chooseDriver(claude, codex);

  assert.equal(v.driver, "claude");
  assert.match(v.reason, /tie/);
  assert.match(v.reason, /defaulting to claude/);
});

test("chooseDriver rounds percentages in reasons and warnings", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [{ usedPercent: 13.456789, resetsAt: 0 }], freshnessTs: 0 };
  const codex: VendorUsage = { vendor: "codex", windows: [], freshnessTs: 0, stale: true };
  const v = chooseDriver(claude, codex);
  assert.match(v.reason, /13%/);
  assert.doesNotMatch(v.reason, /13\.456789/);
});

test("chooseDriver returns null driver when neither vendor has fresh data", () => {
  const claude: VendorUsage = { vendor: "claude", windows: [], freshnessTs: 0, stale: true };
  const codex: VendorUsage = { vendor: "codex", windows: [], freshnessTs: 0, stale: true };
  const v = chooseDriver(claude, codex);
  assert.equal(v.driver, null);
});
