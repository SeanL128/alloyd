# Architecture

## System Overview

Alloy'd is an always-on router primitive that lets one workload draw from two
separate AI *subscriptions* — Claude (via Claude Code) and ChatGPT (via Codex) —
so neither platform's usage meter maxes out. It is **load-balancing, not
cost-cutting**: the only quantity minimized is the peak fraction of any single
platform's usage limit consumed. Total compute may rise slightly by design.

Hard constraint: both sides run on **subscription auth**, never API keys. API-key
auth bypasses the subscription meter and defeats the entire purpose — it is an
unsupported mode the router actively refuses (see Failure Modes).

## High-Level Architecture

The router is a **primitive** split by a hard line into two components:

- **Role suggester** — optional, non-deterministic front-end. Accepts raw task
  text, suggests a role (classification only). May use a model or heuristics.
  Makes no routing decision. Skippable by passing an explicit role.
- **Routing core** — pure, deterministic. Given a work-unit labeled with a role,
  resolves `role → (vendor, model, effort, dispatch-command)` against user config
  + live usage, then returns or executes the dispatch. Table lookup plus a usage
  check. Knows nothing about planning/building/reviewing. Unit-testable.

The purity/testability claim applies to the **core only**.

### Surfaces (three, over one core)

| Surface | What it is | Ships |
|---------|-----------|-------|
| Session-level router | Reads both meters, answers "which CLI drives this session?" | core surface |
| MCP server | Dispatch tool both Claude Code and Codex register | primary work-unit surface |
| CLI wrapper | Thin wrapper over the same core for manual/scripted use | alongside MCP |

The MCP tool is the primary affordance because models invoke tools more reliably
than they follow markdown prose — on Codex especially, the routed path becomes
the natural one.

### Data flow (work-unit dispatch)

```
task text ──▶ [role suggester] ──▶ role ──▶ [routing core]
                                              │  reads user config (role→tier map)
                                              │  reads live usage (both meters)
                                              ▼
                              (vendor, model, effort, dispatch-command)
                                              │
                                              ▼
                         claude -p  /  codex exec   (real user environment)
```

Dispatched work starts **cold** (no conversation context), so the driver must
write a self-contained **task brief** (goal, files, constraints, acceptance
criteria) as the dispatch prompt. The router passes the brief verbatim.

**Grounding the cold subagent.** Two levers cut how much a cold dispatch must
explore before it can work. (1) The rendered brief instructs the subagent to
read *only* the listed `files` and not re-explore, so a narrow `files` list is
the strongest lever on dispatch latency. (2) The pipeline appends a capped
`## Repository map` (`git ls-files`, ≤150 paths / ≤8 KB) built by
`src/grounding.ts`, giving exact paths without exploration — it complements the
`CLAUDE.md`/`AGENTS.md` code map each CLI already auto-loads (prose → exact
paths). Set `ALLOYD_NO_GROUNDING=1` to disable the map.

**Async execution + clean output.** `runDispatch` is async: it splits into a
synchronous `prepareDispatch` (preflight → select → build command) and an async
`executeDispatch` (streams the child via `spawn`, never blocking the event loop
for the 30-min dispatch window). The dispatch templates request structured
output (`claude -p --output-format json`, `codex exec --json`); the pipeline
parses the child's **stdout** into a clean final message
(`extractFinalMessage`), falling back to raw text, so a dispatch returns a
subagent-style conclusion rather than a terminal blob. The MCP `dispatch` tool
takes `background: true` to return a `job-N` id immediately and poll it with
`dispatch_result` — the lever for fanning out independent dispatches without
serially waiting on each.

### Live usage awareness

- **Claude side:** Claude Code statusline payload carries first-party
  `rate_limits.five_hour.used_percentage` / `.seven_day.used_percentage` + reset
  timestamps. A statusline cache hook writes the object to
  `~/.claude/usage-status.json`; the router reads that file.
- **ChatGPT/Codex side (Codex CLI 0.144.1+):** session rollout
  logs `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` carry first-party
  `rate_limits` (`primary.used_percent`, `window_minutes`, `resets_at`,
  `plan_type`). Router parses the newest session file.
- **Staleness rule (asymmetric):** both sources are timestamped with a ~10-min
  TTL. **Codex stale → actively probe** (`codex exec` no-op rewrites its rollout
  log), then re-read. **Claude stale → fall back to static policy**: headless
  `claude -p` does not run the statusline hook, so a probe cannot refresh
  `usage-status.json`; that cache stays fresh only during interactive Claude Code
  use. A failed Codex probe means usage is unknown and the router uses static
  policy.

The router is **symmetric from day one**: either CLI can drive; a Codex-driven
session reads Claude's headroom (a plain file) and routes work *to* Claude, and
vice versa.

### Statusline cache hook (built)

`alloyd setup` registers `scripts/claude-statusline.mjs` as the Claude Code
statusline command (backing up `settings.json` first). A pre-existing
statusline is wrapped, not replaced: its command is passed base64-encoded via
`--wrap`, it keeps rendering exactly as before, and alloyd only caches the
usage payload in front of it. An unrecognized `statusLine` shape is left
untouched and the Claude side degrades to static policy.

The cache write is additive and monotone: unknown top-level keys and windows
missing from the incoming payload survive the rewrite, and within one reset
window (same `resets_at`) only a higher `used_percentage` wins — a payload
with an older `resets_at` is a stale previous-window render (an idle Claude
Code window re-rendering hours-old data) and is ignored. The merge baseline
is snapshotted before any wrapped statusline runs, since wrapped scripts may
write the same cache file.

The hook fails soft: malformed input or a cache-write error leaves Claude Code's
statusline running and preserves the prior cache.

### Configuration model

Nothing is baked into code. Three user-editable dimensions:

- **Roles** — the model classifies work into whatever labels the config defines.
  Starting set (planner / builder / reviewer) is a docs suggestion, not hardcoded.
- **Tiers** — `role → (vendor, model, effort)` per vendor. The tested starting
  map **ships as the default config file** the installer lays down.
- **Effort** — first-class dimension (reasoning-effort level, e.g.
  `model_reasoning_effort=high/medium`). Trades quality against meter-burn like
  tier does.

Cross-vendor equivalence bands (the shipped `config/default.json` defaults,
derived from published benchmark results):

| Band | Claude | ChatGPT |
|------|--------|---------|
| Frontier | Opus 4.8 | GPT-5.6 Sol |
| Value/mid | Sonnet 5 | GPT-5.6 Terra |
| Cheap | Haiku 4.5 | GPT-5.6 Luna |

Bands may now be **one-sided** (`Band.models` is `Partial<Record<Vendor,string>>`):
a band with a model on only one vendor is legal, `substitute()` refuses across to a
missing peer with a clear error, and `selectRoute` degrades that no-peer case to
stay-with-warn rather than a failed dispatch.

### System boundaries

- **Internal:** the routing core, config resolution, usage parsing, dispatch.
- **External integration points:** Claude Code CLI (`claude -p`), Codex CLI
  (`codex exec`), `~/.claude/usage-status.json`, `~/.codex/sessions/**`, the two
  CLIs' instruction files (CLAUDE.md / AGENTS.md), and the Claude enforcement hook.
- Dispatched work runs in the **user's real environment**, so their own
  skills/AGENTS.md load automatically — the router does not sandbox them away.

## Key Architectural Decisions

### Router is a pure primitive, not a workflow
- **What:** Ships **zero workflow skills**. Both CLIs are made *ambiently aware*
  of the router via instructions + (Claude-side) an enforcement hook.
- **Why:** A vetted workflow skill also relies on the model reading markdown, so
  it is no more deterministic than the ambient instruction — both get
  deterministic routing only once the router is invoked. Ambient ships nothing to
  vet, works with any workflow, needs no maintenance as workflows change.
- **Tradeoff:** The model classifies the role on the fly instead of a skill
  pre-labeling it — mitigated by the router accepting task text and suggesting a
  role.

### Inline-vs-dispatch rule
- **What:** *Do lightweight coordination/planning inline; dispatch every
  substantial work unit through the router to a subagent / headless call.*
- **Why:** Load only spreads at a **dispatch boundary**. Inline work already
  burned the driver's meter and spread nothing. This makes routing actually
  reduce meter pressure, and gives a floor so the router doesn't fire on one-line
  edits where dispatch overhead would exceed the work.
- **Tradeoff:** Requires a well-formed task brief per dispatch; routing
  quality largely depends on whether these briefs carry enough context.

### MCP server as the primary surface
- **What:** One MCP server both vendors register; CLI wrapper is secondary.
- **Why:** A tool in the model's toolbox is a stronger, more reliable affordance
  than "shell out to this script" prose. One implementation serves both vendors
  symmetrically.
- **Tradeoff:** Cross-vendor install is inherently two-part (plugin + scripted
  Codex setup), though both parts register the same server.

### Swappable policy layer (static floor, dynamic upside)
- **What:** Static role-split works with **no live usage at all**; usage-aware
  routing is an upgrade to one isolated component.
- **Why:** De-risks the whole project against usage-readability risk — even
  if a log format changes, the router degrades to static policy, not failure.
- **Tradeoff:** Static policy can't respond to real-time headroom; accepted as
  the safe floor.

### Subscription auth only
- **What:** Both sides must use subscription auth; API-key auth is refused.
- **Why:** API keys bypass the subscription meter — the exact thing being
  load-balanced. Supporting them would defeat the goal.
- **Tradeoff:** No unattended/CI-style headless auth path; accepted.

## Distribution

Claude Code distribution is a local marketplace plugin: add the marketplace,
install `alloyd`, then register the statusline cache hook described above.
The plugin registers the `dispatch` MCP tool and its Bash PreToolUse enforcement
hook; `plugin-assets/CLAUDE-snippet.md` is the ambient-rule copy-paste for a
user's CLAUDE.md. Publishing the marketplace is deliberately manual and is not
performed by this repository or its install steps.

Codex remains a separate, scripted setup (`node scripts/setup-codex.mjs`): AGENTS.md
snippet, MCP server registration in `config.toml`, the symmetric enforcement hook
written to `~/.codex/hooks.json` (nested `hooks.PreToolUse` — Codex's real schema,
gated by Codex's per-hook trust prompt the setup instructs the user to approve), and
the `config-setup` skill copied to `~/.codex/skills/`. All idempotent with
`.bak.<ts>` backups. Both vendor surfaces point to the same stdio server, and
dispatched work continues to run in the user's real environment.

## Defaults + config-setup

- **Defaults come from published benchmarks.** Bands and effort defaults in
  `config/default.json` are set from published benchmark results (dataset and
  derivation in `docs/calibration/benchmark-data.md`), which consumes no
  provider capacity. Any future empirical benchmarking should use official APIs
  under metered commercial terms (see `COMPLIANCE.md`).
- **config-setup skill** (`skills/config-setup/SKILL.md`, cross-vendor) — walks a
  model through personalizing `{roles, bands, dispatch}` as points on the
  benchmark-derived band ladder, for first-time setup and new-model releases.
  Three load-bearing safety rules: opt-in before reading any history, approval
  before write, `parseConfig` validation before save.

## What's Intentionally Absent

- **Third vendors (Ollama / OpenRouter / harness generalization)**
  Explicit non-goal; two vendors only.
- **Cost / quality-vs-baseline benchmark apparatus** Explicitly
  dropped; the router does not try to beat a single-model baseline on price.
- **Bundled workflow skills** Core design choice; the router
  is ambient.
- **Mandatory planning/approval ceremony around dispatches** Cut;
  may return later as an *optional* quality mode, but nothing depends on it.
- **Fable 5 in the shipped default bands** Fable 5 is now a permanent
  subscription model, but only on Max/Enterprise plans, so the shipped
  `config/default.json` stays plan-universal; the config-setup skill applies
  the plan-gated Fable band variant (see the Fable 5 recalibration section in
  `docs/calibration/benchmark-data.md`). (Mythos 5 still excluded —
  gated/invite-only.)
- **Heuristic inline-work detection** The enforcement hook can only
  intercept the dispatch path; inline leakage is accepted and mitigated only by
  ambient instructions. No detection machinery is planned.

## Known Gaps / Failure Modes

- **Inline leakage** — the dominant meter burn when it happens. The hook cannot
  stop the driver doing substantial work inline (no dispatch to intercept).
  Accepted; mitigated only by ambient instructions on both vendors.
- **Codex enforcement** — Codex 0.144.1's stable
  `PreToolUse` blocking hook, so hard-enforcement is symmetric; `setup-codex.mjs`
  writes the shared enforce hook into `~/.codex/hooks.json` under the **nested**
  `hooks.PreToolUse` key (Codex's real schema, confirmed against the Codex docs +
  binary), merge-not-clobber, gated by Codex's per-hook trust prompt the user
  approves once.
- **Effort calibration** — a non-blocker; defaults come from published
  benchmarks (`docs/calibration/benchmark-data.md`) and are user-editable.
- **Undocumented log formats** — Codex rollout-log parsing (and the Claude
  statusline shape) could break on a vendor update. Mitigated by fail-soft to
  static policy.
- **Pre-dispatch verification** — before dispatching, the router verifies the
  target CLI exists and is on subscription auth; if missing, auth expired, or it
  would silently fall back to API-key billing, the router **refuses with a clear
  error** rather than dispatching.
- **Both platforms hot** — route to whichever meter has more remaining headroom
  and emit a warning; never silently stall.
