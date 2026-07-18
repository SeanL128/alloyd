import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Merge the statusline cache hook into a Claude Code settings.json, preserving
// everything else. A pre-existing statusline is not replaced: its command is
// wrapped (base64 after --wrap) so the cache hook runs first and the original
// statusline's output is what the user keeps seeing. Returns null on
// unparseable JSON (caller warns + skips).
export function updateSettingsContent(
  content: string,
  scriptPath: string,
): { content: string; wrappedCommand: string | null; skippedUnrecognized?: boolean } | null {
  let config: Record<string, unknown>;
  try {
    config = content.trim() ? JSON.parse(content) : {};
  } catch {
    return null;
  }
  if (!config || Array.isArray(config) || typeof config !== "object") return null;

  const existing = config.statusLine as { command?: unknown } | undefined;
  const existingCommand = existing && typeof existing.command === "string" ? existing.command : null;
  if (existing && existingCommand === null) {
    // A statusLine in a shape we don't recognize — never replace it.
    return { content, wrappedCommand: null, skippedUnrecognized: true };
  }

  let command = `node ${scriptPath}`;
  let wrappedCommand: string | null = null;
  if (existingCommand && existingCommand.includes("claude-statusline.mjs")) {
    // Already ours — refresh the script path, keep any existing --wrap payload.
    const wrapMatch = /--wrap (\S+)/.exec(existingCommand);
    if (wrapMatch) command += ` --wrap ${wrapMatch[1]}`;
  } else if (existingCommand) {
    command += ` --wrap ${Buffer.from(existingCommand, "utf8").toString("base64")}`;
    wrappedCommand = existingCommand;
  }
  config.statusLine = { type: "command", command };
  return { content: `${JSON.stringify(config, null, 2)}\n`, wrappedCommand };
}

// Append or refresh the sentinel-wrapped ambient rule in an instructions file
// (~/.claude/CLAUDE.md). Same sentinel scheme setup-codex.mjs uses for AGENTS.md.
export function updateInstructionsContent(content: string, snippet: string): string {
  const block = `<!-- alloyd:start -->\n${snippet}<!-- alloyd:end -->\n`;
  const sentinelPattern = /<!-- alloyd:start -->[\s\S]*?<!-- alloyd:end -->\r?\n?/;
  if (sentinelPattern.test(content)) return content.replace(sentinelPattern, block);
  if (!content) return block;
  if (content.endsWith("\n\n")) return `${content}${block}`;
  return `${content}${content.endsWith("\n") ? "\n" : "\n\n"}${block}`;
}

export type DispatchMode = "mcp" | "cli";

// Which ambient-rule variant is currently installed in an instructions file.
export function detectMode(content: string): DispatchMode | null {
  const match = /<!-- alloyd:start -->([\s\S]*?)<!-- alloyd:end -->/.exec(content);
  if (!match) return null;
  if (match[1].includes("alloyd dispatch")) return "cli";
  if (match[1].includes("MCP tool")) return "mcp";
  return null;
}

function snippetPathFor(pkgRoot: string, mode: DispatchMode): string {
  return join(pkgRoot, "plugin-assets", mode === "cli" ? "CLAUDE-snippet-cli.md" : "CLAUDE-snippet.md");
}

function applySnippet(filePath: string, snippet: string, dryRun: boolean): "unchanged" | "updated" | "dry" {
  const original = readFileOrEmpty(filePath);
  const updated = updateInstructionsContent(original, snippet);
  if (updated === original) return "unchanged";
  if (dryRun) return "dry";
  mkdirSync(dirname(filePath), { recursive: true });
  if (original) writeFileSync(`${filePath}.bak.${Date.now()}`, original);
  writeFileSync(filePath, updated);
  return "updated";
}

// `alloyd mode <mcp|cli>` — swap the ambient rule on both vendors.
export function setDispatchMode(mode: DispatchMode): number {
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const snippet = readFileSync(snippetPathFor(pkgRoot, mode), "utf8");
  for (const file of [join(homedir(), ".claude", "CLAUDE.md"), join(homedir(), ".codex", "AGENTS.md")]) {
    console.log(`${file}: ${applySnippet(file, snippet, false)}`);
  }
  console.log(
    mode === "mcp"
      ? "Dispatch mode: mcp — work units route through the `dispatch` MCP tool."
      : "Dispatch mode: cli — work units route through `alloyd dispatch` shell calls (no MCP schema in context; make sure `alloyd` is on PATH for both CLIs).",
  );
  return 0;
}

function readFileOrEmpty(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export function runSetup(dryRun: boolean, modeArg?: DispatchMode): number {
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const settingsPath = join(homedir(), ".claude", "settings.json");
  const claudeMdPath = join(homedir(), ".claude", "CLAUDE.md");
  // Preserve an already-chosen dispatch mode on re-runs; default to MCP.
  const mode = modeArg ?? detectMode(readFileOrEmpty(claudeMdPath)) ?? "mcp";
  const snippetPath = snippetPathFor(pkgRoot, mode);
  const scriptPath = join(pkgRoot, "scripts", "claude-statusline.mjs");

  console.log("== Claude side ==");
  const original = readFileOrEmpty(settingsPath);
  const updated = updateSettingsContent(original, scriptPath);
  if (updated === null) {
    console.warn(`${settingsPath} is not valid JSON — skipped; fix or delete it and re-run`);
  } else if (updated.skippedUnrecognized) {
    console.warn("statusline hook: skipped — your statusLine setting has a shape alloyd doesn't recognize, so it was left untouched. Usage-aware routing will fall back to static policy on the Claude side.");
  } else if (updated.content === original) {
    console.log("statusline hook: unchanged");
  } else if (dryRun) {
    console.log(`dry run: would register the usage-cache statusline hook in ${settingsPath}`);
    if (updated.wrappedCommand) console.log(`  (wraps your existing statusline, whose output is kept: ${updated.wrappedCommand})`);
  } else {
    mkdirSync(dirname(settingsPath), { recursive: true });
    if (original) writeFileSync(`${settingsPath}.bak.${Date.now()}`, original);
    writeFileSync(settingsPath, updated.content);
    console.log(`statusline hook: registered in ${settingsPath}`);
    if (updated.wrappedCommand) {
      console.log(`  your existing statusline (${updated.wrappedCommand}) still renders — alloyd only caches the usage payload first`);
    }
  }

  const snippetContent = readFileSync(snippetPath, "utf8");
  const mdResult = applySnippet(claudeMdPath, snippetContent, dryRun);
  console.log(
    mdResult === "unchanged"
      ? "CLAUDE.md ambient rule: unchanged"
      : mdResult === "dry"
        ? `dry run: would append the alloyd ambient rule (${mode} dispatch) to ${claudeMdPath}`
        : `CLAUDE.md ambient rule (${mode} dispatch): appended to ${claudeMdPath} (backup written)`,
  );

  console.log("\n== Codex side ==");
  const codex = spawnSync(
    process.execPath,
    [join(pkgRoot, "scripts", "setup-codex.mjs"), "--snippet", snippetPath, ...(dryRun ? ["--dry-run"] : [])],
    { stdio: "inherit" },
  );

  console.log(`
============================================================
 Setup ${dryRun ? "dry run finished" : "finished"}. Handled for you:
   • Claude usage-cache hook (statusline) — done above
   • Claude ambient rule appended to ~/.claude/CLAUDE.md
   • Codex: AGENTS.md rule, MCP server, enforcement hook,
     config-setup skill — done above

 Every file setup modifies is backed up first as
 <file>.bak.<timestamp> next to the original, and re-running
 setup is always safe (it replaces its own blocks, never
 duplicates them).

 STILL TO DO — 3 steps alloyd cannot do for you:

 1. Open Claude Code and run:
      /plugin marketplace add SeanL128/alloyd
 2. Then run:
      /plugin install alloyd@alloyd
    (this registers the dispatch MCP tool + enforcement hook)
 3. Run \`codex\` interactively once and approve the trust
    prompt for the alloyd hook (mentioned above) — headless
    codex skips untrusted hooks until you do.

 Optional: personalize roles/bands/efforts with the bundled
 config-setup skill — in Claude Code, ask "set up my alloyd
 config" (skill: alloyd:config-setup); in Codex it was
 installed to ~/.codex/skills/config-setup.

 Dispatch mode: ${mode}${mode === "mcp" ? " (default — models invoke tools more\n reliably than shell instructions). Prefer the token-lighter\n CLI dispatch? Run: alloyd mode cli" : ". Switch back anytime: alloyd mode mcp"}

 Then you're done. Run \`alloyd\` anytime to check both meters.
============================================================`);
  return codex.status ?? 1;
}
