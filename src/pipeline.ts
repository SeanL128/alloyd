import { spawn } from "node:child_process";
import { closeSync, fstatSync, globSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseBrief, renderBrief } from "./brief.ts";
import { buildGroundingPack } from "./grounding.ts";
import { buildDispatch, parseConfig, type Route, type RouterConfig } from "./config.ts";
import { selectRoute } from "./policy.ts";
import { verifyVendor, type Preflight } from "./preflight.ts";
import { probeVendor } from "./probe.ts";
import { isStale, parseClaudeUsage, parseCodexUsage, type Vendor, type VendorUsage } from "./usage.ts";

const TTL_SECONDS = 10 * 60;
const DISPATCH_TIMEOUT_MS = 30 * 60 * 1000;
const CLAUDE_FILE = process.env.ALLOYD_CLAUDE_FILE ?? join(homedir(), ".claude", "usage-status.json");
const CODEX_GLOB = process.env.ALLOYD_CODEX_GLOB ?? join(homedir(), ".codex", "sessions", "**", "rollout-*.jsonl");

export type Usage = { claude: VendorUsage; codex: VendorUsage };
export type DispatchExecOptions = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeout: number;
  route: Route;
  reason: string;
  onOutput?: (chunk: string) => void;
};
export type DispatchExecResult = { output: string; exitCode: number };
export type DispatchExec = (command: string, options: DispatchExecOptions) => Promise<DispatchExecResult>;
export type DispatchResult = {
  ok: boolean;
  route?: Route;
  reason: string;
  command: string;
  output?: string;
  rawOutput?: string;
  error?: string;
  exitCode?: number;
};

function unknown(vendor: Vendor): VendorUsage {
  return { vendor, windows: [], freshnessTs: 0, stale: true };
}

function readClaude(now: number): VendorUsage {
  try {
    const usage = parseClaudeUsage(readFileSync(CLAUDE_FILE, "utf8"));
    if (usage.windows.length === 0 || isStale(usage.freshnessTs, now, TTL_SECONDS)) usage.stale = true;
    return usage;
  } catch {
    return unknown("claude");
  }
}

function recentCodexRollouts(): string[] {
  return globSync(CODEX_GLOB)
    .map((path) => ({ path, mtime: statSync(path).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 3)
    .map(({ path }) => path);
}

function readCodexRollout(path: string): string {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const offset = Math.max(0, size - 262144);
    const buffer = Buffer.alloc(size - offset);
    readSync(fd, buffer, 0, buffer.length, offset);
    const text = buffer.toString("utf8");
    // 256KB tail; raise if real rollout rate_limits lines ever fall outside it.
    if (offset === 0) return text;
    const firstNewline = text.indexOf("\n");
    return firstNewline === -1 ? "" : text.slice(firstNewline + 1);
  } finally {
    closeSync(fd);
  }
}

function readCodex(now: number): VendorUsage {
  try {
    for (const path of recentCodexRollouts()) {
      const usage = parseCodexUsage(readCodexRollout(path));
      if (usage.windows.length === 0) continue;
      if (isStale(usage.freshnessTs, now, TTL_SECONDS)) usage.stale = true;
      return usage;
    }
    return unknown("codex");
  } catch {
    return unknown("codex");
  }
}

export function readUsage(opts: { probe: boolean }): Usage {
  const now = Date.now() / 1000;
  let claude = readClaude(now);
  let codex = readCodex(now);

  if (opts.probe) {
    if (codex.stale && verifyVendor("codex").ok) {
      console.error("probing codex (stale data)…");
      if (probeVendor("codex")) codex = readCodex(now);
    }
  }

  return { claude, codex };
}

export function loadConfig(): RouterConfig {
  const path = process.env.ALLOYD_CONFIG;
  const json = path
    ? readFileSync(path, "utf8")
    : readFileSync(new URL("../config/default.json", import.meta.url), "utf8");
  return parseConfig(json);
}

function defaultExec(command: string, options: DispatchExecOptions): Promise<DispatchExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
    cwd: options.cwd,
    env: options.env,
    shell: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const output = (): string => `${stdout}${stderr}`;
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      (error as Error & { output?: string }).output = output();
      reject(error);
    };
    const timeout = setTimeout(() => {
      child.kill();
      fail(new Error(`dispatch timed out after ${options.timeout}ms`));
    }, options.timeout);

    child.stdout.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      stdout += text;
      options.onOutput?.(text);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.once("error", fail);
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ output: output(), exitCode: code ?? 1 });
    });
  });
}

export function formatRouteSummary(route: Route, reason: string): string {
  return `→ ${route.role}: ${route.vendor}/${route.model} (${route.effort}) — ${reason}`;
}

export function extractFinalMessage(vendor: Vendor, rawOutput: string): string {
  try {
    if (vendor === "claude") {
      const parsed = JSON.parse(rawOutput) as { result?: unknown };
      return typeof parsed.result === "string" ? parsed.result : rawOutput;
    }
    let finalMessage: string | undefined;
    for (const line of rawOutput.split("\n")) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as {
        type?: unknown;
        item?: { type?: unknown; text?: unknown };
        msg?: { type?: unknown; message?: unknown };
      };
      if (parsed.type === "item.completed" && parsed.item?.type === "agent_message" && typeof parsed.item.text === "string") {
        finalMessage = parsed.item.text;
      }
      if (parsed.msg?.type === "agent_message" && typeof parsed.msg.message === "string") {
        finalMessage = parsed.msg.message;
      }
    }
    return finalMessage ?? rawOutput;
  } catch {
    return rawOutput;
  }
}

export type DispatchOptions = {
  role: string;
  brief: unknown;
  dryRun?: boolean;
  probe?: boolean;
  exec?: DispatchExec;
  usage?: Usage;
  verify?: (vendor: Vendor) => Preflight;
};

export type PreparedDispatch = { route: Route; reason: string; command: string };

export function prepareDispatch(opts: DispatchOptions): DispatchResult | PreparedDispatch {
  let route: Route | undefined;
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

    const pack = buildGroundingPack(process.cwd());
    const prompt = pack ? `${renderBrief(brief)}\n\n${pack}` : renderBrief(brief);
    command = buildDispatch(config, route, prompt);
    return { route, reason, command };
  } catch (error) {
    return {
      ok: false,
      route,
      reason,
      command,
      error: error instanceof Error ? error.message : String(error),
      output: error instanceof Error && typeof (error as unknown as { output?: unknown }).output === "string"
        ? (error as unknown as { output: string }).output
        : undefined,
      exitCode: 1,
    };
  }
}

function resultFromExecution(prepared: PreparedDispatch, execution: DispatchExecResult): DispatchResult {
  const output = extractFinalMessage(prepared.route.vendor, execution.output);
  const rawOutput = output === execution.output ? undefined : execution.output;
  if (execution.exitCode !== 0) {
    return {
      ok: false,
      ...prepared,
      output,
      rawOutput,
      error: `dispatch command exited with code ${execution.exitCode}`,
      exitCode: execution.exitCode,
    };
  }
  return { ok: true, ...prepared, output, rawOutput, exitCode: 0 };
}

export async function executeDispatch(prepared: PreparedDispatch, opts: Pick<DispatchOptions, "exec"> = {}): Promise<DispatchResult> {
  try {
    const execution = await (opts.exec ?? defaultExec)(prepared.command, {
      cwd: process.cwd(),
      env: { ...process.env, ALLOYD_DISPATCH: "1" },
      timeout: DISPATCH_TIMEOUT_MS,
      route: prepared.route,
      reason: prepared.reason,
    });
    return resultFromExecution(prepared, execution);
  } catch (error) {
    return {
      ok: false,
      ...prepared,
      error: error instanceof Error ? error.message : String(error),
      output: error instanceof Error && typeof (error as unknown as { output?: unknown }).output === "string"
        ? (error as unknown as { output: string }).output
        : undefined,
      exitCode: 1,
    };
  }
}

export async function runDispatch(opts: DispatchOptions): Promise<DispatchResult> {
  const prepared = prepareDispatch(opts);
  if ("ok" in prepared) return prepared;
  if (opts.dryRun) return { ok: true, ...prepared, exitCode: 0 };
  return executeDispatch(prepared, opts);
}
