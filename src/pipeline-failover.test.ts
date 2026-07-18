import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "alloyd-failover-"));
const claudeFile = join(dir, "claude-usage.json");
const codexGlob = join(dir, "sessions", "**", "rollout-*.jsonl");
const rolloutFile = join(dir, "sessions", "2026", "07", "15", "rollout-x.jsonl");
const originalClaudeFile = process.env.ALLOYD_CLAUDE_FILE;
const originalCodexGlob = process.env.ALLOYD_CODEX_GLOB;
const originalConfig = process.env.ALLOYD_CONFIG;

process.env.ALLOYD_CLAUDE_FILE = claudeFile;
process.env.ALLOYD_CODEX_GLOB = codexGlob;
delete process.env.ALLOYD_CONFIG;

// This file has its own node --test process, so these module-level env overrides
// are set before pipeline.ts is imported and cannot race static imports elsewhere.
const { runDispatch } = await import("./pipeline.ts");

const BRIEF = {
  goal: "Ship failover coverage",
  files: ["src/pipeline.ts"],
  constraints: "Use synthetic usage files only",
  acceptance: "Routes correctly",
};

function writeUsage(claudeUsed: number, codexUsed: number): void {
  const now = Date.now();
  mkdirSync(join(dir, "sessions", "2026", "07", "15"), { recursive: true });
  writeFileSync(claudeFile, JSON.stringify({
    ts: now / 1000,
    rate_limits: {
      five_hour: { used_percentage: claudeUsed, resets_at: new Date(now + 3_600_000).toISOString() },
    },
  }));
  writeFileSync(rolloutFile, `${JSON.stringify({
    timestamp: new Date(now).toISOString(),
    payload: {
      rate_limits: {
        primary: { used_percent: codexUsed, resets_at: new Date(now + 3_600_000).toISOString() },
      },
    },
  })}\n`);
}

after(() => {
  rmSync(dir, { recursive: true, force: true });
  if (originalClaudeFile === undefined) delete process.env.ALLOYD_CLAUDE_FILE;
  else process.env.ALLOYD_CLAUDE_FILE = originalClaudeFile;
  if (originalCodexGlob === undefined) delete process.env.ALLOYD_CODEX_GLOB;
  else process.env.ALLOYD_CODEX_GLOB = originalCodexGlob;
  if (originalConfig === undefined) delete process.env.ALLOYD_CONFIG;
  else process.env.ALLOYD_CONFIG = originalConfig;
});

test("routes hot Claude usage to the equal-band Codex model from usage files", async () => {
  writeUsage(95, 10);

  const result = await runDispatch({
    role: "planner",
    brief: BRIEF,
    dryRun: true,
    probe: false,
    verify: () => ({ ok: true, reason: "" }),
  });

  assert.equal(result.ok, true);
  assert.ok(result.route);
  assert.equal(result.route.vendor, "codex");
  assert.equal(result.route.model, "gpt-5.6-terra");
  assert.match(result.reason, /substituting/);
  assert.match(result.command, /codex exec/);
  assert.match(result.command, /gpt-5\.6-terra/);
});

test("keeps the planner on Claude when both file-backed meters are cool", async () => {
  writeUsage(10, 10);

  const result = await runDispatch({
    role: "planner",
    brief: BRIEF,
    dryRun: true,
    probe: false,
    verify: () => ({ ok: true, reason: "" }),
  });

  assert.equal(result.ok, true);
  assert.ok(result.route);
  assert.equal(result.route.vendor, "claude");
  assert.equal(result.route.model, "claude-sonnet-5");
});
