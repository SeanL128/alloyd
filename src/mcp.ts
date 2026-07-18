#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chooseDriver } from "./usage.ts";
import { executeDispatch, formatRouteSummary, loadConfig, prepareDispatch, readUsage, type DispatchResult } from "./pipeline.ts";
import { suggestRole } from "./suggest.ts";

const server = new McpServer({ name: "alloyd", version: "0.0.0" });

// ponytail: in-memory job table, lost on MCP server restart; persist to disk if that ever matters.
type BackgroundJob = { promise: Promise<DispatchResult>; result?: DispatchResult; startedAt: number; role: string };
const jobs = new Map<string, BackgroundJob>();
let nextJob = 1;

function formatDispatchResult(result: DispatchResult, dryRun = false): { isError?: true; content: [{ type: "text"; text: string }] } {
  if (!result.ok || !result.route) {
    const prefix = result.route ? `${formatRouteSummary(result.route, result.reason)}\n` : "";
    return {
      isError: true,
      content: [{ type: "text", text: `${prefix}${result.output ?? ""}${result.error ?? "dispatch failed"}` }],
    };
  }
  if (dryRun) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ command: result.command, route: result.route, reason: result.reason }, null, 2),
      }],
    };
  }
  return {
    content: [{ type: "text", text: `${formatRouteSummary(result.route, result.reason)}\n${result.output ?? ""}` }],
  };
}

server.registerTool(
  "dispatch",
  {
    title: "Dispatch Alloyd Task",
    description: "Route a structured task brief to the selected subscription-authenticated vendor CLI; set background for result polling.",
    inputSchema: z.object({
      role: z.string(),
      brief: z.object({
        goal: z.string(),
        files: z.array(z.string()),
        constraints: z.string(),
        acceptance: z.string(),
      }),
      dry_run: z.boolean().optional(),
      background: z.boolean().optional(),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ role, brief, dry_run, background }, extra) => {
    const prepared = prepareDispatch({ role, brief });
    if ("ok" in prepared) return formatDispatchResult(prepared);
    if (dry_run) return formatDispatchResult({ ok: true, ...prepared, exitCode: 0 }, true);

    if (background) {
      const jobId = `job-${nextJob++}`;
      const job: BackgroundJob = { promise: executeDispatch(prepared), startedAt: Date.now(), role };
      jobs.set(jobId, job);
      void job.promise.then((result) => { job.result = result; });
      return {
        content: [{ type: "text", text: `${formatRouteSummary(prepared.route, prepared.reason)}\njob: ${jobId} (background)` }],
      };
    }

    const startedAt = Date.now();
    const progressToken = extra._meta?.progressToken;
    const heartbeat = progressToken === undefined ? undefined : setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      void (async () => {
        try {
          await extra.sendNotification({
            method: "notifications/progress",
            params: {
              progressToken,
              progress: elapsed,
              message: `${role} → ${prepared.route.vendor}/${prepared.route.model} running ${elapsed}s`,
            },
          });
        } catch {
          // Progress is best-effort.
        }
      })();
    }, 10_000);
    try {
      return formatDispatchResult(await executeDispatch(prepared));
    } finally {
      if (heartbeat) clearInterval(heartbeat);
    }
  },
);

server.registerTool(
  "dispatch_result",
  {
    title: "Alloyd Dispatch Result",
    description: "Poll a background dispatch result.",
    inputSchema: z.object({ job_id: z.string() }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ job_id }) => {
    const job = jobs.get(job_id);
    if (!job) return { isError: true, content: [{ type: "text", text: `unknown job: ${job_id}` }] };
    if (!job.result) {
      const elapsed = Math.floor((Date.now() - job.startedAt) / 1000);
      return { content: [{ type: "text", text: `${job_id} running (${elapsed}s elapsed, ${job.role})` }] };
    }
    return formatDispatchResult(job.result);
  },
);

server.registerTool(
  "status",
  {
    title: "Alloyd Status",
    description: "Read both vendors' usage and return the current driver verdict.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const { claude, codex } = readUsage({ probe: true });
    const verdict = chooseDriver(claude, codex);
    return {
      content: [{ type: "text", text: JSON.stringify({ claude, codex, verdict }, null, 2) }],
    };
  },
);

server.registerTool(
  "suggest_role",
  {
    title: "Suggest Alloyd Role",
    description: "Suggest a configured role for a task using keyword classification.",
    inputSchema: z.object({
      task_text: z.string(),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ task_text }) => ({
    content: [{ type: "text", text: JSON.stringify(suggestRole(loadConfig(), task_text), null, 2) }],
  }),
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
