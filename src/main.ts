#!/usr/bin/env node
// alloyd <command> — thin dispatcher over the existing entrypoints.
const [command, ...rest] = process.argv.slice(2);

const HELP = `usage: alloyd [command]

  status     read both usage meters and pick a session driver (default)
             flags: --json --no-probe
  dispatch   route one work unit: alloyd dispatch <role> --brief <path.json>
             flags: --dry-run --no-probe
  setup      wire up the statusline cache hook, ambient rules, and Codex
             integration   flags: --dry-run --dispatch <mcp|cli>
  update     re-run the wiring after upgrading alloyd (keeps your settings)
  mode       switch how work is dispatched: alloyd mode <mcp|cli>
  help       show this message

Full documentation: docs/USAGE.md in the repo.`;

function dispatchModeArg(args: string[]): "mcp" | "cli" | undefined {
  const index = args.indexOf("--dispatch");
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value !== "mcp" && value !== "cli") {
    console.error("--dispatch must be mcp or cli");
    process.exit(1);
  }
  return value;
}

if (command === "setup" || command === "update") {
  const { runSetup } = await import("./setup.ts");
  process.exit(runSetup(rest.includes("--dry-run"), dispatchModeArg(rest)));
} else if (command === "mode") {
  const value = rest[0];
  if (value !== "mcp" && value !== "cli") {
    console.error("usage: alloyd mode <mcp|cli>");
    process.exit(1);
  }
  const { setDispatchMode } = await import("./setup.ts");
  process.exit(setDispatchMode(value));
} else if (command === "dispatch") {
  process.argv = [process.argv[0], process.argv[1], ...rest];
  await import("./dispatch-cli.ts");
} else if (command === undefined || command === "status" || command.startsWith("--")) {
  const flags = command?.startsWith("--") ? [command, ...rest] : rest;
  process.argv = [process.argv[0], process.argv[1], ...flags];
  await import("./cli.ts");
} else {
  console.log(HELP);
  if (command !== "help") process.exit(1);
}
