import { test } from "node:test";
import assert from "node:assert/strict";
import { probeVendor } from "./probe.ts";

test("probeVendor runs the pinned Claude probe with literal argv", () => {
  let call: [string, string[]] | undefined;

  assert.equal(probeVendor("claude", (cmd, args) => {
    call = [cmd, args];
  }), true);

  assert.deepEqual(call, ["claude", ["-p", "--model", "claude-haiku-4-5-20251001", "reply with only: ok"]]);
});

test("probeVendor runs the pinned Codex probe with literal argv", () => {
  let call: [string, string[]] | undefined;

  assert.equal(probeVendor("codex", (cmd, args) => {
    call = [cmd, args];
  }), true);

  assert.deepEqual(call, ["codex", ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.6-luna", "reply with only: ok"]]);
});

test("probeVendor fails soft when an injected exec throws", () => {
  const failingExec = () => {
    throw new Error("probe failed");
  };

  assert.equal(probeVendor("claude", failingExec), false);
  assert.equal(probeVendor("codex", failingExec), false);
});
