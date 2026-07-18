# Patterns

Conventions with 2+ real instances in the code. Keep entries citing real files;
delete any that drift out of the codebase.

## Pure core, I/O at the edge, policy injected

The load-bearing convention. All decision logic lives in **pure functions** that
take plain data and return plain data — no file reads, no clock, no shell. I/O
sits in a thin outer shell that reads the world, calls the pure core, and prints.

- Pure: `src/usage.ts` (`parseClaudeUsage`, `parseCodexUsage`, `chooseDriver`),
  `src/config.ts` (`resolveRoute`, `substitute`, `parseConfig`). All take
  strings/objects, return objects, throw on bad input. Unit-tested directly with
  no mocks (`src/usage.test.ts`, `src/config.test.ts`).
- I/O edge: `readUsage` in `src/pipeline.ts` reads `~/.claude/usage-status.json`
  + the newest Codex rollouts, stamps the clock, then hands strings to the pure
  parsers; `src/cli.ts` and the MCP `status` tool just format its result.

Why: the "pure, deterministic, unit-testable core" claim only holds if the
core never touches the world. It also makes the policy layer swappable —
`chooseDriver` / `substitute` are the seams usage-aware routing plugs
into without touching I/O.

## Fail soft to static, never crash

Any failure reading or parsing live usage degrades to a safe default; it never
throws out of the I/O edge. `src/cli.ts` wraps every read in try/catch and
returns an `unknown` (stale) vendor on error; `parseCodexUsage` skips corrupt
JSONL lines rather than failing. Load-time config validation is the exception —
`parseConfig` throws loudly, because a mis-wired config should fail fast at
install, not silently mis-route at runtime.

## Zero-dependency Node 24 + `node:test`

No build step, no test framework. `.ts` runs directly under Node 24 (native
type-stripping); tests are `node:test` + `node:assert/strict` run with
`npm test` (which is `node --test src/*.test.ts` — bare `node --test src/` does
NOT discover tests on Node 24.5.0). The only runtime deps are the MCP surface's
`@modelcontextprotocol/sdk` + `zod` (MCP surface only); everything else is
built-in. Fixtures are real captured payloads inlined in the test file (see the
Claude/Codex shapes in `src/usage.test.ts`), so tests exercise the actual
on-disk formats.

## Injected side-effects for testability

Anything that shells out or reads live state takes an **optional injectable**
performing the effect, defaulting to the real one, so tests drive pure logic with
no real subprocess or file. `probeVendor(vendor, exec?)` defaults `exec` to
`execFileSync` (`src/probe.ts`); `runDispatch({..., exec?})` and the usage inputs
are injectable in `src/pipeline.ts`. Tests assert the exact argv/command string
(`src/probe.test.ts`, `src/pipeline.test.ts`) — a mock that only checks "was
called" would prove nothing, so at least one test pins the final command. Where a
seam isn't worth adding, the path itself is env-overridable for hermetic tests:
`ALLOYD_CLAUDE_FILE`/`ALLOYD_CODEX_GLOB` (`src/pipeline.ts`) let
`src/pipeline-failover.test.ts` drive the real file→dispatch chain from a tmpdir,
and `setup-codex.mjs` tests run under a sandboxed `HOME=$(mktemp -d)`.

## Single home for the dispatch flow

The preflight→`selectRoute`→`buildDispatch`→exec flow lives once, in
`runDispatch` (`src/pipeline.ts`); `src/mcp.ts` and `src/dispatch-cli.ts` are
thin adapters over it, never re-implementations. The subscription-auth refusal
guard sits after route selection and before both the `dry_run` return and any
exec, so **no flag can bypass it** and `dry_run` executes nothing.

## Hooks and scripts fail open / soft, never brick the host

Anything wired into a live external surface degrades safely on its own errors.
`hooks/enforce-router.mjs` wraps everything in try/catch and has **no non-zero
exit path** — it only ever emits a deny result (exit 0) or nothing, so a broken
hook can never block the user's Bash. `scripts/claude-statusline.mjs` always
exits 0 and never clobbers a good cache on empty input; `scripts/setup-codex.mjs`
backs up before every write and edits only the section/sentinels it owns. Same
spirit as "fail soft to static" above, applied to the distribution surfaces.

See `docs/architecture.md` for the design.
