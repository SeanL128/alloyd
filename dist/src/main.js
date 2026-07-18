#!/usr/bin/env node
// alloyd <command> — thin dispatcher over the existing entrypoints.
const [command, ...rest] = process.argv.slice(2);
const HELP = `usage: alloyd [command]

  status     read both usage meters and pick a session driver (default)
             flags: --json --no-probe
  dispatch   route one work unit: alloyd dispatch <role> --brief <path.json>
             flags: --dry-run --no-probe
  setup      wire up the statusline cache hook + Codex integration
             flags: --dry-run
  help       show this message`;
if (command === "setup") {
    const { runSetup } = await import("./setup.js");
    process.exit(runSetup(rest.includes("--dry-run")));
}
else if (command === "dispatch") {
    process.argv = [process.argv[0], process.argv[1], ...rest];
    await import("./dispatch-cli.js");
}
else if (command === undefined || command === "status" || command.startsWith("--")) {
    const flags = command?.startsWith("--") ? [command, ...rest] : rest;
    process.argv = [process.argv[0], process.argv[1], ...flags];
    await import("./cli.js");
}
else {
    console.log(HELP);
    if (command !== "help")
        process.exit(1);
}
export {};
