<div align="center">

<img src="docs/banner.svg" alt="Alloy'd" width="440" />

**A local router that spreads one coding workload across your own Claude and ChatGPT subscriptions, while each provider continues to meter and enforce its own limits.**

![version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square) ![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-d97757?style=flat-square) ![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

[Learn more →](https://seanlindsay.xyz/alloyd) · [Install](#quick-start) · [Roadmap](#roadmap)

</div>

## Why

I built Alloy'd because I pay for two AI subscriptions, Claude and ChatGPT, and I kept burning through one plan's usage window while the other sat mostly idle. Alloy'd is a router that both Claude Code and Codex are made ambiently aware of, so that substantial work units get dispatched to whichever side has the headroom, through the official `claude -p` and `codex exec` interfaces, on subscription auth only. It is important to understand that this is load-balancing rather than extra capacity: each provider still meters and enforces its own limits, and total compute may even rise slightly by design (see the [Disclaimer](#disclaimer)).

## Features

- **Usage-aware routing** — reads both providers' live usage meters and sends each work unit to whichever subscription has more headroom, falling back to a static role split when live data is stale or missing.
- **Cross-vendor failover bands** — every role's model belongs to an equivalence band (frontier, value, cheap), so failing over to the other vendor substitutes an equal-caliber model rather than a random one.
- **Official interfaces only** — dispatches through `claude -p` and `codex exec` in your real environment, and refuses to run at all if either CLI is missing or would silently fall back to API-key billing.
- **MCP dispatch tool** — one stdio MCP server that both Claude Code and Codex register, so whichever CLI is driving can route work as a tool call instead of following prose instructions.
- **Symmetric enforcement hooks** — a PreToolUse hook on each side blocks direct `claude -p` / `codex exec` shell-outs, keeping substantial work on the routed path.
- **One command line** — `alloyd` reports which CLI should drive your session, `alloyd dispatch` routes a single work unit, and `alloyd setup` wires up both vendors.

## Quick start

```sh
npm install -g github:SeanL128/alloyd
alloyd setup
```

In Claude Code, install the plugin:

```text
/plugin marketplace add SeanL128/alloyd
/plugin install alloyd@alloyd
```

`alloyd setup` wires up the Codex side, the usage-cache hook, and the ambient rule in your CLAUDE.md for you, then prints the few remaining steps it cannot do itself (installing the Claude Code plugin, which registers the `dispatch` MCP tool and enforcement hook, and approving Codex's one-time hook trust prompt). Every file setup modifies is backed up first as `<file>.bak.<timestamp>`, and an existing statusline keeps rendering exactly as before, since alloyd only caches the usage payload in front of it. After that, run `alloyd` any time to see which CLI should drive your session, and the routing itself happens ambiently as you work. Requires macOS or Linux and Node 24+ (or 23.6+), with the Claude Code and Codex CLIs installed and signed in on subscription auth (API-key auth is refused by design).

## Configuration

| Option | What it does | Default |
|--------|--------------|---------|
| `roles` | User-defined aliases, each mapping to a vendor, model, and effort level | `planner` / `builder` / `reviewer` |
| `bands` | Cross-vendor equivalence tiers used to substitute an equal-caliber model on failover | `frontier` / `value` / `cheap` |
| `dispatch` | Per-vendor command templates with required `{model}`, `{effort}`, and `{prompt}` placeholders | official CLI invocations |

All three live in `config/default.json`, are user-editable, and nothing is baked into code; set `ALLOYD_CONFIG` to point at your own file. The bundled config-setup skill (installed on both vendors by the plugin and `alloyd setup`) walks a model through personalizing them — in Claude Code, just ask to "set up my alloyd config".

Dispatch defaults to the MCP tool because models invoke tools more reliably than they follow shell instructions in prose; if you prefer keeping the tool schema out of context, `alloyd mode cli` switches both vendors' ambient rules to the equivalent `alloyd dispatch` command line, and `alloyd mode mcp` switches back.

More in [docs/USAGE.md](docs/USAGE.md).

## Roadmap

- [x] Routing core with usage-aware policy and cross-vendor failover
- [x] MCP dispatch server plus the `alloyd` CLI (status, dispatch, setup)
- [x] Claude Code plugin and scripted Codex setup, each with an enforcement hook
- [x] Benchmark-derived default bands and efforts
- [ ] Native Windows support (platform-aware dispatch quoting)
- [ ] Thin CLI launcher that renders the official CLIs' streamed events

## License

[MIT](LICENSE)

## Disclaimer

Alloy'd is an independent project with no affiliation with, or endorsement by, Anthropic or OpenAI. It invokes each provider's official CLI on your own accounts, and each provider continues to meter and enforce its own usage limits; it does not bypass quotas or grant capacity beyond what you purchased. You are responsible for your accounts, your plan eligibility, and your compliance with the terms that apply to you. The project's terms-of-service assessment lives in [COMPLIANCE.md](COMPLIANCE.md), and the software is provided as-is under the MIT license.

---

<div align="center">

Built by Sean Lindsay · [seanlindsay.xyz](https://seanlindsay.xyz)

</div>
