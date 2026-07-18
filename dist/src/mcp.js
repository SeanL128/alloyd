#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chooseDriver } from "./usage.js";
import { formatRouteSummary, loadConfig, readUsage, runDispatch } from "./pipeline.js";
import { suggestRole } from "./suggest.js";
const server = new McpServer({ name: "alloyd", version: "0.0.0" });
server.registerTool("dispatch", {
    title: "Dispatch Alloyd Task",
    description: "Route a structured task brief to the selected subscription-authenticated vendor CLI.",
    inputSchema: z.object({
        role: z.string(),
        brief: z.object({
            goal: z.string(),
            files: z.array(z.string()),
            constraints: z.string(),
            acceptance: z.string(),
        }),
        dry_run: z.boolean().optional(),
    }),
    annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
    },
}, async ({ role, brief, dry_run }) => {
    const result = runDispatch({ role, brief, dryRun: dry_run });
    if (!result.ok || !result.route) {
        const prefix = result.route ? `${formatRouteSummary(result.route, result.reason)}\n` : "";
        const output = result.output ?? "";
        return {
            isError: true,
            content: [{ type: "text", text: `${prefix}${output}${result.error ?? "dispatch failed"}` }],
        };
    }
    if (dry_run) {
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ command: result.command, route: result.route, reason: result.reason }, null, 2),
                }],
        };
    }
    return {
        content: [{
                type: "text",
                text: `${formatRouteSummary(result.route, result.reason)}\n${result.output ?? ""}`,
            }],
    };
});
server.registerTool("status", {
    title: "Alloyd Status",
    description: "Read both vendors' usage and return the current driver verdict.",
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
}, async () => {
    const { claude, codex } = readUsage({ probe: true });
    const verdict = chooseDriver(claude, codex);
    return {
        content: [{ type: "text", text: JSON.stringify({ claude, codex, verdict }, null, 2) }],
    };
});
server.registerTool("suggest_role", {
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
}, async ({ task_text }) => ({
    content: [{ type: "text", text: JSON.stringify(suggestRole(loadConfig(), task_text), null, 2) }],
}));
async function main() {
    await server.connect(new StdioServerTransport());
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
