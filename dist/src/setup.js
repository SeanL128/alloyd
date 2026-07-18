import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Merge the statusline command into a Claude Code settings.json, preserving
// everything else. Returns null on unparseable JSON (caller warns + skips).
export function updateSettingsContent(content, command) {
    let config;
    try {
        config = content.trim() ? JSON.parse(content) : {};
    }
    catch {
        return null;
    }
    if (!config || Array.isArray(config) || typeof config !== "object")
        return null;
    const existing = config.statusLine;
    const replacedCommand = existing && typeof existing.command === "string" && existing.command !== command
        ? existing.command
        : null;
    config.statusLine = { type: "command", command };
    return { content: `${JSON.stringify(config, null, 2)}\n`, replacedCommand };
}
function readFileOrEmpty(path) {
    try {
        return readFileSync(path, "utf8");
    }
    catch (error) {
        if (error && error.code === "ENOENT")
            return "";
        throw error;
    }
}
export function runSetup(dryRun) {
    const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const settingsPath = join(homedir(), ".claude", "settings.json");
    const statusCommand = `node ${join(pkgRoot, "scripts", "claude-statusline.mjs")}`;
    console.log("== Claude side ==");
    const original = readFileOrEmpty(settingsPath);
    const updated = updateSettingsContent(original, statusCommand);
    if (updated === null) {
        console.warn(`${settingsPath} is not valid JSON — skipped; fix or delete it and re-run`);
    }
    else if (updated.content === original) {
        console.log("statusline hook: unchanged");
    }
    else if (dryRun) {
        console.log(`dry run: would set statusLine in ${settingsPath} to:\n  ${statusCommand}`);
        if (updated.replacedCommand)
            console.log(`  (would replace: ${updated.replacedCommand})`);
    }
    else {
        mkdirSync(dirname(settingsPath), { recursive: true });
        if (original)
            writeFileSync(`${settingsPath}.bak.${Date.now()}`, original);
        writeFileSync(settingsPath, updated.content);
        console.log(`statusline hook: registered in ${settingsPath}`);
        if (updated.replacedCommand) {
            console.log(`  replaced your previous statusline (${updated.replacedCommand}) — a .bak file sits next to settings.json`);
        }
    }
    console.log("\n== Codex side ==");
    const codex = spawnSync(process.execPath, [join(pkgRoot, "scripts", "setup-codex.mjs"), ...(dryRun ? ["--dry-run"] : [])], { stdio: "inherit" });
    const snippet = readFileSync(join(pkgRoot, "plugin-assets", "CLAUDE-snippet.md"), "utf8");
    console.log(`
== Remaining manual steps (Claude Code) ==
1. Inside Claude Code, run:  /plugin marketplace add SeanL128/alloyd
2. Then run:                 /plugin install alloyd@alloyd
   (registers the dispatch MCP tool + enforcement hook)
3. Paste this into your ~/.claude/CLAUDE.md so Claude routes work ambiently:

${snippet}`);
    return codex.status ?? 1;
}
