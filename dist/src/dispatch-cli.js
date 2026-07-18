#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { formatRouteSummary, runDispatch } from "./pipeline.js";
const USAGE = "usage: node src/dispatch-cli.ts <role> --brief <path.json> [--dry-run] [--no-probe]";
function fail(message) {
    console.error(message);
    process.exit(1);
}
const args = process.argv.slice(2);
const role = args[0];
const briefIndex = args.indexOf("--brief");
const briefPath = briefIndex === -1 ? undefined : args[briefIndex + 1];
const knownIndexes = new Set([0, briefIndex, briefIndex + 1]);
for (const flag of ["--dry-run", "--no-probe"]) {
    const index = args.indexOf(flag);
    if (index !== -1)
        knownIndexes.add(index);
}
if (!role || role.startsWith("--") || !briefPath || briefPath.startsWith("--") || args.some((_, index) => !knownIndexes.has(index))) {
    fail(USAGE);
}
let brief;
try {
    brief = JSON.parse(readFileSync(briefPath, "utf8"));
}
catch (error) {
    fail(error instanceof Error ? error.message : String(error));
}
const dryRun = args.includes("--dry-run");
let summaryPrinted = false;
const streamExec = (command, options) => {
    console.log(formatRouteSummary(options.route, options.reason));
    summaryPrinted = true;
    const child = spawnSync(command, {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
        shell: true,
        stdio: "inherit",
    });
    if (child.error)
        throw child.error;
    return { output: "", exitCode: child.status ?? 1 };
};
const result = runDispatch({
    role,
    brief,
    dryRun,
    probe: !args.includes("--no-probe"),
    exec: streamExec,
});
if (result.route && !summaryPrinted)
    console.log(formatRouteSummary(result.route, result.reason));
if (dryRun && result.ok)
    console.log(result.command);
if (result.output)
    process.stdout.write(result.output);
if (!result.ok)
    console.error(result.error ?? "dispatch failed");
process.exitCode = result.ok ? 0 : result.exitCode ?? 1;
