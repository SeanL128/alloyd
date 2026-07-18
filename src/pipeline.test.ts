import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDispatch } from "./pipeline.ts";
import type { VendorUsage } from "./usage.ts";

const BRIEF = {
  goal: "Ship MCP",
  files: ["src/pipeline.ts", "src/mcp.ts"],
  constraints: "Use the shared pipeline",
  acceptance: "Tests pass",
};

const UNKNOWN_USAGE: { claude: VendorUsage; codex: VendorUsage } = {
  claude: { vendor: "claude", windows: [], freshnessTs: 0, stale: true },
  codex: { vendor: "codex", windows: [], freshnessTs: 0, stale: true },
};

const EXPECTED_COMMAND = `codex exec --skip-git-repo-check --sandbox workspace-write -m gpt-5.6-sol -c model_reasoning_effort=medium '## Goal
Ship MCP

## Files
- src/pipeline.ts
- src/mcp.ts

## Constraints
Use the shared pipeline

## Acceptance criteria
Tests pass'`;

test("dry run returns the exact command without executing it", () => {
  let executed = false;

  const result = runDispatch({
    role: "builder",
    brief: BRIEF,
    dryRun: true,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: () => {
      executed = true;
      return { output: "should not run", exitCode: 0 };
    },
  });

  assert.equal(executed, false);
  assert.equal(result.ok, true);
  assert.equal(result.command, EXPECTED_COMMAND);
  assert.equal(result.route.vendor, "codex");
  assert.equal(result.reason, "usage unknown → static policy");
  assert.equal(result.output, undefined);
});

test("preflight refusal surfaces the reason and skips execution", () => {
  let executed = false;

  const result = runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({
      ok: false,
      reason: "OPENAI_API_KEY is set — dispatch would bill the API key, not the subscription; unset it",
    }),
    exec: () => {
      executed = true;
      return { output: "should not run", exitCode: 0 };
    },
  });

  assert.equal(executed, false);
  assert.equal(result.ok, false);
  assert.equal(result.command, "");
  assert.equal(result.error, "OPENAI_API_KEY is set — dispatch would bill the API key, not the subscription; unset it");
});

test("executed child receives route context, dispatch marker, and execution limits", () => {
  let call: {
    command: string;
    cwd: string;
    timeout: number;
    dispatch: string | undefined;
    vendor: string;
    reason: string;
  } | undefined;

  const result = runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: (command, options) => {
      call = {
        command,
        cwd: options.cwd,
        timeout: options.timeout,
        dispatch: options.env.ALLOYD_DISPATCH,
        vendor: options.route.vendor,
        reason: options.reason,
      };
      return { output: "child output\nchild warning\n", exitCode: 0 };
    },
  });

  assert.deepEqual(call, {
    command: EXPECTED_COMMAND,
    cwd: process.cwd(),
    timeout: 30 * 60 * 1000,
    dispatch: "1",
    vendor: "codex",
    reason: "usage unknown → static policy",
  });
  assert.equal(result.ok, true);
  assert.equal(result.output, "child output\nchild warning\n");
  assert.equal(result.exitCode, 0);
});

test("nonzero child exit is returned without throwing", () => {
  const result = runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: () => ({ output: "failure details\n", exitCode: 7 }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.output, "failure details\n");
  assert.equal(result.error, "dispatch command exited with code 7");
  assert.equal(result.exitCode, 7);
});

test("dispatch failure preserves captured partial output", () => {
  const result = runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: () => {
      throw Object.assign(new Error("spawn timeout"), { output: "partial…" });
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /spawn timeout/);
  assert.equal(result.output, "partial…");
});

test("dispatch failure without captured output leaves output undefined", () => {
  const result = runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: () => {
      throw new Error("spawn timeout");
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /spawn timeout/);
  assert.equal(result.output, undefined);
});

test("dispatch CLI dry run prints the route and command without running the vendor CLI", () => {
  const dir = mkdtempSync(join(tmpdir(), "alloyd-cli-"));
  try {
    const bin = join(dir, "bin");
    const claudeDir = join(dir, ".claude");
    const briefPath = join(dir, "brief.json");
    mkdirSync(bin);
    mkdirSync(claudeDir);
    const claudePath = join(bin, "claude");
    writeFileSync(claudePath, "#!/bin/sh\necho vendor-cli-must-not-run >&2\nexit 99\n");
    chmodSync(claudePath, 0o755);
    writeFileSync(briefPath, JSON.stringify(BRIEF));

    const child = spawnSync(process.execPath, ["src/dispatch-cli.ts", "planner", "--brief", briefPath, "--dry-run", "--no-probe"], {
      cwd: process.cwd(),
      env: { ...process.env, HOME: dir, PATH: bin },
      encoding: "utf8",
    });

    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stdout, /^→ planner: claude\/claude-sonnet-5 \(high\) — usage unknown → static policy\n/);
    assert.match(child.stdout, /claude -p --model claude-sonnet-5 --effort high/);
    assert.doesNotMatch(child.stderr, /vendor-cli-must-not-run/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MCP stdio server lists dispatch, status, and suggest_role", () => {
  const input = [
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "pipeline-test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    "",
  ].join("\n");

  const child = spawnSync(process.execPath, ["src/mcp.ts"], {
    cwd: process.cwd(),
    input,
    encoding: "utf8",
    timeout: 10_000,
  });

  assert.equal(child.status, 0, child.stderr);
  const messages = child.stdout.trim().split("\n").map((line) => JSON.parse(line));
  const listed = messages.find((message) => message.id === 2);
  assert.deepEqual(listed.result.tools.map((tool: { name: string }) => tool.name), ["dispatch", "status", "suggest_role"]);
});
