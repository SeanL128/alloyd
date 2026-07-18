#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const agentsSnippet = "## alloyd (ambient rule)\n\nUse the router.\n";

function runSelfTest() {
  const wrappedSnippet = `<!-- alloyd:start -->\n${agentsSnippet}<!-- alloyd:end -->\n`;

  assert.equal(
    updateAgentsContent("", agentsSnippet),
    wrappedSnippet,
    "adds the sentinel-wrapped snippet to a fresh AGENTS.md",
  );
  assert.equal(
    updateAgentsContent(wrappedSnippet, agentsSnippet),
    wrappedSnippet,
    "replaces an already-installed AGENTS.md snippet without duplication",
  );
  assert.equal(
    updateAgentsContent("# Existing rules\n\n", agentsSnippet),
    `# Existing rules\n\n${wrappedSnippet}`,
    "preserves unrelated AGENTS.md content",
  );

  const registration = "[mcp_servers.alloyd]\ncommand = \"node\"\nargs = [\"/repo/src/mcp.ts\"]\n";
  assert.equal(
    updateConfigContent("", registration),
    registration,
    "adds the MCP section to a fresh config.toml",
  );
  assert.equal(
    updateConfigContent(registration, registration),
    registration,
    "replaces an already-installed MCP section without duplication",
  );
  assert.equal(
    updateConfigContent(
      "model = \"x\"\n\n[mcp_servers.other]\ncommand = \"other\"\n\n[mcp_servers.alloyd]\ncommand = \"old\"\nargs = [\"old\"]\n\n[mcp_servers.third]\ncommand = \"third\"\n\n[features]\nfeature_flag = true\n",
      registration,
    ),
    "model = \"x\"\n\n[mcp_servers.other]\ncommand = \"other\"\n\n[mcp_servers.alloyd]\ncommand = \"node\"\nargs = [\"/repo/src/mcp.ts\"]\n[mcp_servers.third]\ncommand = \"third\"\n\n[features]\nfeature_flag = true\n",
    "replaces only the middle alloyd section and preserves other MCP and top-level sections",
  );

  const hookCommand = "node /repo/hooks/enforce-router.mjs";
  const freshHooks = updateHooksContent("", hookCommand);
  assert.ok(freshHooks, "adds a hooks.json entry to a fresh config");
  assert.deepEqual(
    JSON.parse(freshHooks),
    {
      hooks: {
        PreToolUse: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: hookCommand }],
          },
        ],
      },
    },
    "writes the expected fresh nested hooks.json entry",
  );
  assert.equal(
    updateHooksContent(freshHooks, hookCommand),
    freshHooks,
    "re-running hooks.json setup is idempotent",
  );

  // Merge preserves an existing nested PostToolUse entry (the real Codex shape) and other top-level keys.
  const unrelatedHook = { matcher: "Edit|Write", hooks: [{ type: "command", command: "node keep.mjs" }] };
  const mergedHooks = updateHooksContent(
    JSON.stringify({ version: 1, hooks: { PostToolUse: [unrelatedHook] } }),
    hookCommand,
  );
  assert.ok(mergedHooks, "merges into existing hooks.json");
  assert.deepEqual(
    JSON.parse(mergedHooks),
    {
      version: 1,
      hooks: {
        PostToolUse: [unrelatedHook],
        PreToolUse: [{ matcher: "*", hooks: [{ type: "command", command: hookCommand }] }],
      },
    },
    "preserves unrelated nested hooks and top-level keys",
  );

  const replacedHooks = updateHooksContent(
    JSON.stringify({
      hooks: {
        PreToolUse: [
          unrelatedHook,
          { matcher: "old", hooks: [{ type: "command", command: "node /old/hooks/enforce-router.mjs" }] },
        ],
      },
    }),
    hookCommand,
  );
  assert.ok(replacedHooks, "replaces an existing alloyd hook");
  const parsedReplacedHooks = JSON.parse(replacedHooks);
  assert.equal(parsedReplacedHooks.hooks.PreToolUse.length, 2, "does not duplicate a stale alloyd hook");
  assert.equal(parsedReplacedHooks.hooks.PreToolUse[1].hooks[0].command, hookCommand, "replaces the stale path");

  // A valid-JSON entry with a non-string command must not throw (fail-safe predicate).
  const nonStringCmd = updateHooksContent(
    JSON.stringify({ hooks: { PreToolUse: [{ matcher: "x", hooks: [{ type: "command", command: 123 }] }] } }),
    hookCommand,
  );
  assert.ok(nonStringCmd, "tolerates a non-string command without throwing");
  assert.equal(
    JSON.parse(nonStringCmd).hooks.PreToolUse.length,
    2,
    "appends the alloyd entry rather than matching a non-string command",
  );
  assert.equal(updateHooksContent("{", hookCommand), null, "leaves invalid hooks.json untouched");

  const selfTestDir = mkdtempSync(join(tmpdir(), "alloyd-setup-codex-"));
  const selfTestSkillPath = join(selfTestDir, "skills", "config-setup", "SKILL.md");
  const selfTestSkill = "---\nname: config-setup\n---\n";
  try {
    assert.equal(installSkill(selfTestSkillPath, selfTestSkill), true, "installs a new skill file");
    assert.equal(readFileSync(selfTestSkillPath, "utf8"), selfTestSkill, "writes the skill content exactly");
    assert.equal(installSkill(selfTestSkillPath, selfTestSkill), false, "re-running skill install is content-idempotent");
  } finally {
    rmSync(selfTestDir, { recursive: true, force: true });
  }

  console.log("setup-codex self-test passed");
}

function appendBlock(content, block) {
  if (!content) return block;
  if (content.endsWith("\n\n")) return `${content}${block}`;
  return `${content}${content.endsWith("\n") ? "\n" : "\n\n"}${block}`;
}

function updateAgentsContent(content, snippet) {
  const block = `<!-- alloyd:start -->\n${snippet}<!-- alloyd:end -->\n`;
  const sentinelPattern = /<!-- alloyd:start -->[\s\S]*?<!-- alloyd:end -->\r?\n?/;
  return sentinelPattern.test(content) ? content.replace(sentinelPattern, block) : appendBlock(content, block);
}

function updateConfigContent(content, registration) {
  // String-level TOML edit; swap for a parser only if users report corrupted configs.
  const header = /^\[mcp_servers\.alloyd\][^\r\n]*(?:\r?\n|$)/m.exec(content);
  if (!header || header.index === undefined) return appendBlock(content, registration);

  const sectionStart = header.index;
  const afterHeader = sectionStart + header[0].length;
  const nextHeaderOffset = content.slice(afterHeader).search(/^\[/m);
  const sectionEnd = nextHeaderOffset === -1 ? content.length : afterHeader + nextHeaderOffset;
  return `${content.slice(0, sectionStart)}${registration}${content.slice(sectionEnd)}`;
}

function updateHooksContent(content, hookCommand) {
  let config;
  try {
    config = content ? JSON.parse(content) : {};
  } catch {
    return null;
  }

  if (!config || Array.isArray(config) || typeof config !== "object") return null;
  // Codex reads hooks nested under a top-level `hooks` key (verified against the
  // OpenAI Codex docs + a real ~/.codex/hooks.json): { hooks: { PreToolUse: [...] } }.
  if (!config.hooks || Array.isArray(config.hooks) || typeof config.hooks !== "object") config.hooks = {};
  if (!Array.isArray(config.hooks.PreToolUse)) config.hooks.PreToolUse = [];

  const entry = {
    matcher: "*",
    hooks: [{ type: "command", command: hookCommand }],
  };
  const existingIndex = config.hooks.PreToolUse.findIndex((item) =>
    typeof item?.hooks?.[0]?.command === "string" &&
    item.hooks[0].command.includes("hooks/enforce-router.mjs"),
  );

  if (existingIndex === -1) {
    config.hooks.PreToolUse.push(entry);
  } else {
    config.hooks.PreToolUse[existingIndex] = entry;
  }

  return `${JSON.stringify(config, null, 2)}\n`;
}

function readFileOrEmpty(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return "";
    throw error;
  }
}

function writeWithBackup(filePath, content) {
  const original = readFileOrEmpty(filePath);
  if (original === content) return false;

  writeFileSync(`${filePath}.bak.${Date.now()}`, original);
  writeFileSync(filePath, content);
  return true;
}

function installSkill(skillPath, skillContent) {
  mkdirSync(dirname(skillPath), { recursive: true });
  return writeWithBackup(skillPath, skillContent);
}

function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");
  const codexDir = join(homedir(), ".codex");
  const agentsPath = join(codexDir, "AGENTS.md");
  const configPath = join(codexDir, "config.toml");
  const hooksPath = join(codexDir, "hooks.json");
  const skillPath = join(codexDir, "skills", "config-setup", "SKILL.md");
  const snippetArgIndex = process.argv.indexOf("--snippet");
  const snippetPath =
    snippetArgIndex === -1 ? join(repoRoot, "plugin-assets", "CLAUDE-snippet.md") : process.argv[snippetArgIndex + 1];
  const snippet = readFileSync(snippetPath, "utf8");
  const skillContent = readFileSync(join(repoRoot, "skills", "config-setup", "SKILL.md"), "utf8");
  // Prefer the compiled server: Node refuses to type-strip .ts files under
  // node_modules, so a global npm install must register dist/mcp.js.
  const mcpEntry = existsSync(join(repoRoot, "dist", "mcp.js"))
    ? join(repoRoot, "dist", "mcp.js")
    : join(repoRoot, "src", "mcp.ts");
  const registration = `[mcp_servers.alloyd]\ncommand = "node"\nargs = [${JSON.stringify(mcpEntry)}]\n`;
  const hookCommand = `node ${join(repoRoot, "hooks", "enforce-router.mjs")}`;
  const agentsContent = updateAgentsContent(readFileOrEmpty(agentsPath), snippet);
  const configContent = updateConfigContent(readFileOrEmpty(configPath), registration);
  const hooksContent = updateHooksContent(readFileOrEmpty(hooksPath), hookCommand);
  const dryRun = process.argv.includes("--dry-run");

  if (hooksContent === null) {
    console.warn("hooks.json is not valid JSON — skipped; fix or delete it and re-run");
  }

  if (dryRun) {
    console.log(`--- ${agentsPath} ---`);
    process.stdout.write(agentsContent);
    console.log(`--- ${configPath} ---`);
    process.stdout.write(configContent);
    if (hooksContent !== null) {
      console.log(`--- ${hooksPath} ---`);
      process.stdout.write(hooksContent);
    }
    console.log(`--- ${skillPath} ---`);
    process.stdout.write(skillContent);
    console.log("dry run: no files written");
    console.log("Codex gates hooks behind per-hook trust. One-time step: run `codex` interactively and approve the trust prompt for the alloyd hook — until then, headless `codex exec` skips it.");
    return;
  }

  mkdirSync(codexDir, { recursive: true });
  const agentsChanged = writeWithBackup(agentsPath, agentsContent);
  const configChanged = writeWithBackup(configPath, configContent);
  const hooksChanged = hooksContent === null ? undefined : writeWithBackup(hooksPath, hooksContent);
  const skillChanged = installSkill(skillPath, skillContent);
  console.log(`AGENTS.md: ${agentsChanged ? "updated" : "unchanged"}`);
  console.log(`config.toml: ${configChanged ? "updated" : "unchanged"}`);
  if (hooksChanged !== undefined) console.log(`hooks.json: ${hooksChanged ? "updated" : "unchanged"}`);
  console.log(`skill: ${skillChanged ? "updated" : "unchanged"}`);
  console.log(`config-setup skill: ${skillPath}`);
  console.log("Codex gates hooks behind per-hook trust. One-time step: run `codex` interactively and approve the trust prompt for the alloyd hook — until then, headless `codex exec` skips it.");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  main();
}
