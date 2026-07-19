import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractFinalMessage, prepareDispatch, runDispatch } from "./pipeline.ts";
import type { VendorUsage } from "./usage.ts";

// Grounding injects process.cwd()'s git file-map, which is nondeterministic
// here (repo contents change). Disable it by default; the two tests below
// re-enable it explicitly to assert injection and the off-switch.
process.env.ALLOYD_NO_GROUNDING = "1";
delete process.env.ALLOYD_CONFIG;

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

const EXPECTED_COMMAND = `codex exec --skip-git-repo-check --sandbox workspace-write --json -m gpt-5.6-sol -c model_reasoning_effort=medium '## Goal
Ship MCP

## Files
- src/pipeline.ts
- src/mcp.ts

Read the files above first — they are the scope of this task. Only look beyond them if one of them references something not listed here.

## Constraints
Use the shared pipeline

## Acceptance criteria
Tests pass'`;

test("dry run returns the exact command without executing it", async () => {
  let executed = false;

  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    dryRun: true,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async () => {
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

test("preflight refusal surfaces the reason and skips execution", async () => {
  let executed = false;

  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({
      ok: false,
      reason: "OPENAI_API_KEY is set — dispatch would bill the API key, not the subscription; unset it",
    }),
    exec: async () => {
      executed = true;
      return { output: "should not run", exitCode: 0 };
    },
  });

  assert.equal(executed, false);
  assert.equal(result.ok, false);
  assert.equal(result.command, "");
  assert.equal(result.error, "OPENAI_API_KEY is set — dispatch would bill the API key, not the subscription; unset it");
});

test("executed child receives route context, dispatch marker, and execution limits", async () => {
  let call: {
    command: string;
    cwd: string;
    timeout: number;
    dispatch: string | undefined;
    vendor: string;
    reason: string;
  } | undefined;

  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async (command, options) => {
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

test("nonzero child exit is returned without throwing", async () => {
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async () => ({ output: "failure details\n", exitCode: 7 }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.output, "failure details\n");
  assert.equal(result.error, "dispatch command exited with code 7");
  assert.equal(result.exitCode, 7);
});

test("zero exit with empty output is reported as failure", async () => {
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async () => ({ output: "", exitCode: 0 }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "dispatch exited 0 but produced no final message (killed or crashed silently?)");
  assert.equal(result.exitCode, 1);
});

test("dispatch failure preserves captured partial output", async () => {
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async () => {
      throw Object.assign(new Error("spawn timeout"), { output: "partial…" });
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /spawn timeout/);
  assert.equal(result.output, "partial…");
});

test("dispatch failure without captured output leaves output undefined", async () => {
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async () => {
      throw new Error("spawn timeout");
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /spawn timeout/);
  assert.equal(result.output, undefined);
});

test("runDispatch awaits injected execution", async () => {
  let released = false;
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    exec: async () => {
      await Promise.resolve();
      released = true;
      return { output: "done", exitCode: 0 };
    },
  });

  assert.equal(released, true);
  assert.equal(result.output, "done");
});

test("prepareDispatch builds the command without executing it", () => {
  const prepared = prepareDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
  });

  assert.ok(!("ok" in prepared));
  if ("ok" in prepared) return;
  assert.equal(prepared.command, EXPECTED_COMMAND);
});

test("extractFinalMessage reads Claude JSON output", () => {
  assert.equal(extractFinalMessage("claude", '{"result":"final answer"}'), "final answer");
});

test("extractFinalMessage reads the last Codex agent message from JSONL", () => {
  const output = [
    '{"type":"item.completed","item":{"type":"agent_message","text":"first"}}',
    '{"msg":{"type":"agent_message","message":"final answer"}}',
  ].join("\n");
  assert.equal(extractFinalMessage("codex", output), "final answer");
});

test("extractFinalMessage falls back to non-JSON output", () => {
  assert.equal(extractFinalMessage("codex", "plain terminal output"), "plain terminal output");
});

test("extractFinalMessage falls back when Claude result is not a string", () => {
  assert.equal(extractFinalMessage("claude", '{"result":42}'), '{"result":42}');
});

test("dispatch extracts the final message from stdout, ignoring stderr in combined output", async () => {
  const stdout = '{"msg":{"type":"agent_message","message":"final answer"}}';
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
    // Combined output has trailing stderr noise that is not JSON; extraction
    // must read stdout only, or JSON.parse throws and collapses to raw.
    exec: async () => ({ output: `${stdout}\nWARN: codex wrote to stderr\n`, stdout, exitCode: 0 }),
  });

  assert.equal(result.output, "final answer");
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
    assert.match(child.stdout, /claude -p --output-format json --model claude-sonnet-5 --effort high/);
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
  assert.deepEqual(listed.result.tools.map((tool: { name: string }) => tool.name), ["dispatch", "dispatch_result", "status", "suggest_role"]);
});

test("dispatch appends the repository-map grounding pack when enabled", async () => {
  delete process.env.ALLOYD_NO_GROUNDING;
  try {
    const result = await runDispatch({
      role: "builder",
      brief: BRIEF,
      dryRun: true,
      usage: UNKNOWN_USAGE,
      verify: () => ({ ok: true, reason: "" }),
    });
    assert.equal(result.ok, true);
    assert.match(result.command ?? "", /## Repository map/);
  } finally {
    process.env.ALLOYD_NO_GROUNDING = "1";
  }
});

test("ALLOYD_NO_GROUNDING omits the grounding pack from the command", async () => {
  const result = await runDispatch({
    role: "builder",
    brief: BRIEF,
    dryRun: true,
    usage: UNKNOWN_USAGE,
    verify: () => ({ ok: true, reason: "" }),
  });
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.command ?? "", /## Repository map/);
});
