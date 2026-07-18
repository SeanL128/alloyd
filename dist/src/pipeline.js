import { spawnSync } from "node:child_process";
import { closeSync, fstatSync, globSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseBrief, renderBrief } from "./brief.js";
import { buildDispatch, parseConfig } from "./config.js";
import { selectRoute } from "./policy.js";
import { verifyVendor } from "./preflight.js";
import { probeVendor } from "./probe.js";
import { isStale, parseClaudeUsage, parseCodexUsage } from "./usage.js";
const TTL_SECONDS = 10 * 60;
const DISPATCH_TIMEOUT_MS = 30 * 60 * 1000;
const CLAUDE_FILE = process.env.ALLOYD_CLAUDE_FILE ?? join(homedir(), ".claude", "usage-status.json");
const CODEX_GLOB = process.env.ALLOYD_CODEX_GLOB ?? join(homedir(), ".codex", "sessions", "**", "rollout-*.jsonl");
function unknown(vendor) {
    return { vendor, windows: [], freshnessTs: 0, stale: true };
}
function readClaude(now) {
    try {
        const usage = parseClaudeUsage(readFileSync(CLAUDE_FILE, "utf8"));
        if (usage.windows.length === 0 || isStale(usage.freshnessTs, now, TTL_SECONDS))
            usage.stale = true;
        return usage;
    }
    catch {
        return unknown("claude");
    }
}
function recentCodexRollouts() {
    return globSync(CODEX_GLOB)
        .map((path) => ({ path, mtime: statSync(path).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 3)
        .map(({ path }) => path);
}
function readCodexRollout(path) {
    const fd = openSync(path, "r");
    try {
        const size = fstatSync(fd).size;
        const offset = Math.max(0, size - 262144);
        const buffer = Buffer.alloc(size - offset);
        readSync(fd, buffer, 0, buffer.length, offset);
        const text = buffer.toString("utf8");
        // 256KB tail; raise if real rollout rate_limits lines ever fall outside it.
        if (offset === 0)
            return text;
        const firstNewline = text.indexOf("\n");
        return firstNewline === -1 ? "" : text.slice(firstNewline + 1);
    }
    finally {
        closeSync(fd);
    }
}
function readCodex(now) {
    try {
        for (const path of recentCodexRollouts()) {
            const usage = parseCodexUsage(readCodexRollout(path));
            if (usage.windows.length === 0)
                continue;
            if (isStale(usage.freshnessTs, now, TTL_SECONDS))
                usage.stale = true;
            return usage;
        }
        return unknown("codex");
    }
    catch {
        return unknown("codex");
    }
}
export function readUsage(opts) {
    const now = Date.now() / 1000;
    let claude = readClaude(now);
    let codex = readCodex(now);
    if (opts.probe) {
        if (codex.stale && verifyVendor("codex").ok) {
            console.error("probing codex (stale data)…");
            if (probeVendor("codex"))
                codex = readCodex(now);
        }
    }
    return { claude, codex };
}
export function loadConfig() {
    const path = process.env.ALLOYD_CONFIG;
    const json = path
        ? readFileSync(path, "utf8")
        : readFileSync(new URL("../config/default.json", import.meta.url), "utf8");
    return parseConfig(json);
}
function defaultExec(command, options) {
    const child = spawnSync(command, {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
        shell: true,
        encoding: "utf8",
    });
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    if (child.error) {
        child.error.output = output;
        throw child.error;
    }
    return { output, exitCode: child.status ?? 1 };
}
export function formatRouteSummary(route, reason) {
    return `→ ${route.role}: ${route.vendor}/${route.model} (${route.effort}) — ${reason}`;
}
export function runDispatch(opts) {
    let route;
    let reason = "";
    let command = "";
    try {
        const brief = parseBrief(opts.brief);
        const config = loadConfig();
        const usage = opts.usage ?? readUsage({ probe: opts.probe ?? true });
        const selection = selectRoute(config, opts.role, usage);
        route = selection.route;
        reason = selection.reason;
        // ASSUMPTION: Select before preflight so a substituted vendor is always checked.
        const preflight = (opts.verify ?? verifyVendor)(route.vendor);
        if (!preflight.ok) {
            return { ok: false, route, reason, command, error: preflight.reason, exitCode: 1 };
        }
        command = buildDispatch(config, route, renderBrief(brief));
        if (opts.dryRun)
            return { ok: true, route, reason, command, exitCode: 0 };
        const execution = (opts.exec ?? defaultExec)(command, {
            cwd: process.cwd(),
            env: { ...process.env, ALLOYD_DISPATCH: "1" },
            timeout: DISPATCH_TIMEOUT_MS,
            route,
            reason,
        });
        if (execution.exitCode !== 0) {
            return {
                ok: false,
                route,
                reason,
                command,
                output: execution.output,
                error: `dispatch command exited with code ${execution.exitCode}`,
                exitCode: execution.exitCode,
            };
        }
        return { ok: true, route, reason, command, output: execution.output, exitCode: 0 };
    }
    catch (error) {
        return {
            ok: false,
            route,
            reason,
            command,
            error: error instanceof Error ? error.message : String(error),
            output: error instanceof Error && typeof error.output === "string"
                ? error.output
                : undefined,
            exitCode: 1,
        };
    }
}
