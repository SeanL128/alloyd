import assert from "node:assert/strict";
import { test } from "node:test";
import { updateSettingsContent } from "./setup.ts";

const script = "/pkg/scripts/claude-statusline.mjs";

test("registers the plain hook when no statusline exists", () => {
  const result = updateSettingsContent("", script);
  assert.ok(result);
  assert.deepEqual(JSON.parse(result.content), { statusLine: { type: "command", command: `node ${script}` } });
  assert.equal(result.wrappedCommand, null);
});

test("preserves unrelated settings keys", () => {
  const result = updateSettingsContent(JSON.stringify({ model: "opus", permissions: { allow: ["Bash"] } }), script);
  assert.ok(result);
  const parsed = JSON.parse(result.content);
  assert.equal(parsed.model, "opus");
  assert.deepEqual(parsed.permissions, { allow: ["Bash"] });
});

test("wraps a foreign statusline instead of replacing it", () => {
  const result = updateSettingsContent(JSON.stringify({ statusLine: { type: "command", command: "my-status.sh --cool" } }), script);
  assert.ok(result);
  assert.equal(result.wrappedCommand, "my-status.sh --cool");
  const command = (JSON.parse(result.content) as { statusLine: { command: string } }).statusLine.command;
  const encoded = /--wrap (\S+)/.exec(command)?.[1] ?? "";
  assert.equal(Buffer.from(encoded, "base64").toString("utf8"), "my-status.sh --cool");
  assert.ok(command.startsWith(`node ${script} --wrap `));
});

test("is idempotent and keeps the wrap payload when already registered", () => {
  const first = updateSettingsContent(JSON.stringify({ statusLine: { type: "command", command: "my-status.sh" } }), script);
  assert.ok(first);
  const second = updateSettingsContent(first.content, script);
  assert.ok(second);
  assert.equal(second.content, first.content);
  assert.equal(second.wrappedCommand, null);
});

test("returns null on invalid JSON", () => {
  assert.equal(updateSettingsContent("{", script), null);
});

import { updateInstructionsContent } from "./setup.ts";

const snippet = "## alloyd (ambient rule)\n\nUse the router.\n";
const block = `<!-- alloyd:start -->\n${snippet}<!-- alloyd:end -->\n`;

test("appends the sentinel block to an empty CLAUDE.md", () => {
  assert.equal(updateInstructionsContent("", snippet), block);
});

test("preserves existing CLAUDE.md content", () => {
  assert.equal(updateInstructionsContent("# Mine\n", snippet), `# Mine\n\n${block}`);
});

test("replaces a stale sentinel block without duplication", () => {
  const stale = `# Mine\n\n<!-- alloyd:start -->\nold\n<!-- alloyd:end -->\n`;
  assert.equal(updateInstructionsContent(stale, snippet), `# Mine\n\n${block}`);
});

test("is idempotent when already installed", () => {
  const once = updateInstructionsContent("# Mine\n", snippet);
  assert.equal(updateInstructionsContent(once, snippet), once);
});

import { detectMode } from "./setup.ts";

test("detectMode identifies mcp, cli, and absent blocks", () => {
  const mcp = updateInstructionsContent("", "Use the alloyd `dispatch` MCP tool.\n");
  const cli = updateInstructionsContent("", "Run `alloyd dispatch <role> --brief x`.\n");
  assert.equal(detectMode(mcp), "mcp");
  assert.equal(detectMode(cli), "cli");
  assert.equal(detectMode("# no block\n"), null);
});

test("leaves an unrecognized statusLine shape untouched", () => {
  const original = JSON.stringify({ statusLine: { type: "future", handler: {} } });
  const result = updateSettingsContent(original, script);
  assert.ok(result);
  assert.equal(result.skippedUnrecognized, true);
  assert.equal(result.content, original);
});
