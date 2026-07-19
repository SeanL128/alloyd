# Usage

Every command lives under the single `alloyd` binary. Run `alloyd help` for the
short version of this page.

## alloyd (or alloyd status)

Reads both usage meters and answers "which CLI should drive this session?".

```sh
alloyd            # human-readable meters + verdict
alloyd --json     # same data as JSON
alloyd --no-probe # skip the active Codex probe when its data is stale
```

## alloyd dispatch

Routes one work unit through the router: resolves the role against your config
and live usage, builds the vendor command, and runs it in your real
environment.

```sh
alloyd dispatch <role> --brief <path.json> [--dry-run] [--no-probe]
```

The brief file is the entire prompt the dispatched model sees (dispatched work
starts cold), so it must be self-contained: goal, files, constraints, and
acceptance criteria. `--dry-run` prints the resolved route and command without
executing it.

A grounding pack (a capped repo file map) is appended to every dispatch prompt
so the cold subagent gets exact paths up front; set `ALLOYD_NO_GROUNDING=1` to
disable it. Dispatched CLIs run with JSON output (`--output-format json` /
`--json` in the dispatch templates) and alloyd extracts the final message, so
the result reads like a subagent's report rather than a raw terminal dump.

Via the MCP tool, `dispatch` also accepts `background: true`: it returns a
`job-N` id immediately and the work runs detached — poll it with the
`dispatch_result` tool. Use this to fan out independent work units in parallel
instead of blocking on each dispatch.

## alloyd setup

Wires up everything it can on both vendors and prints the few steps it cannot
do itself. Idempotent: re-running replaces alloyd's own blocks and never
duplicates them, and every file it touches gets a timestamped `.bak` first.

```sh
alloyd setup [--dry-run] [--dispatch <mcp|cli>]
```

Handled for you: the Claude Code statusline cache hook in
`~/.claude/settings.json`, the ambient rule in `~/.claude/CLAUDE.md`, and the
Codex side (`~/.codex/AGENTS.md` rule, MCP server registration in
`config.toml`, enforcement hook in `hooks.json`, and the config-setup skill).
Left for you: installing the Claude Code plugin and approving Codex's one-time
hook trust prompt. In Claude Code, run:

```text
/plugin marketplace add SeanL128/alloyd
/plugin install alloyd@alloyd
```

## alloyd update

Alias of `setup`: re-runs the same idempotent wiring. Use it after upgrading
alloyd so refreshed snippets, hook paths, and skills land in place. Your chosen
dispatch mode and any personalized config are preserved.

## alloyd mode

Switches how the ambient rules tell models to dispatch work, on both vendors
at once.

```sh
alloyd mode mcp   # dispatch via the MCP tool (default)
alloyd mode cli   # dispatch via `alloyd dispatch` shell calls
```

The default is `mcp` because a tool in the model's toolbox is invoked more
reliably than a shell instruction in prose, and a missed dispatch costs more
meter spread than a tool schema costs tokens. `cli` keeps the MCP schema out
of context entirely, which is lighter per session; if you use it, make sure
`alloyd` is on the PATH both CLIs see.

## Configuration

Routing behavior lives in `config/default.json` (`roles`, `bands`,
`dispatch`), is entirely user-editable, and can be pointed elsewhere with the
`ALLOYD_CONFIG` environment variable. The bundled config-setup skill walks a
model through personalizing it.
