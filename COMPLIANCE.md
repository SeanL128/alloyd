# Compliance

**Last reviewed:** 2026-07-17

This document records the project's terms-of-service assessment so users can see
exactly what Alloy'd does and does not do with their provider accounts. It is
not legal advice, and provider terms or product documentation may change.

## Summary

Alloy'd invokes the providers' official CLIs using the user's own accounts,
preserves each provider's limits, and does not share credentials or create
additional capacity. On that basis, the core router appears reasonably
compliant for personal use and public open-source distribution.

One area receives extra caution: reading Codex usage percentages from
undocumented local session files. It is not clearly prohibited, but it lacks
the explicit documentation support of ordinary CLI dispatch, so it is held to a
stricter standard here, with the mitigations described below.

The shipped routing defaults are set from published benchmark results, which
consumes no provider capacity at all.

## Core routing

Alloy'd dispatches work through `claude -p` and `codex exec`. Both are official
non-interactive interfaces intended for scripts and automation:

- Claude Code programmatic use:
  <https://code.claude.com/docs/en/headless>
- Codex non-interactive mode:
  <https://learn.chatgpt.com/docs/non-interactive-mode>

The router does not defeat either service's rate limits. When one independently
purchased service has less available capacity, it may send later work to the
other independently purchased service. Each provider continues to meter and
enforce its own usage limits.

Distribution of this source code does not itself access either service. Users
remain responsible for their accounts, content, plan eligibility, and
compliance with the terms applicable to them.

### How this project describes itself

Alloy'd is a local router that respects provider limits. It does not bypass
quotas, evade restrictions, or grant capacity beyond what the user purchased,
and its documentation avoids language that could make legitimate routing sound
like circumvention.

Alloy'd is not affiliated with or endorsed by Anthropic or OpenAI, and its
branding is kept visually and verbally distinct from Claude Code, Codex,
Anthropic, and OpenAI.

## A presentation-layer CLI

A local CLI that selects a provider and renders events produced by the official
CLIs appears consistent with their documented automation interfaces:

- Claude's `--output-format stream-json` exposes streaming text, tool use,
  results, retries, and session metadata.
- Codex's `codex exec --json` exposes agent messages, command executions, file
  changes, MCP calls, searches, plans, and usage events.

Displaying those events in an Alloy'd TUI is lower risk than implementing a new
agent runtime, because rendering machine-readable output is the exact intended
purpose of those flags. The underlying provider CLI remains responsible for
model access, authentication, tool execution, permissions, sandboxing, and
rate-limit enforcement. Any such surface must accurately label the selected
provider and must not claim that it performed tool calls actually performed by
Claude Code or Codex.

Risk would increase if the CLI became a replacement service with its own agent
loop, hosted accounts, credential custody, resale, or replicated provider
branding. At that point, official SDK/API access under the applicable
commercial terms is the clearer basis.

## Usage-meter sources

### Claude

The Claude usage source is documented. Claude Code intentionally sends
`rate_limits.five_hour` and `rate_limits.seven_day` to configured status-line
commands, and Anthropic documents parsing and displaying these values:

<https://code.claude.com/docs/en/statusline>

Alloy'd's status-line helper stores those supplied fields locally for the
router. This appears to be an intended use of the interface. The cache may be
stale when no interactive Claude Code session has refreshed it, so stale data
degrades to static routing rather than being worked around.

### Codex

Alloy'd reads `rate_limits` records from the user's local Codex session
(rollout) JSONL files. This is probably permissible because:

- The files are intentionally written locally by the user's installed CLI.
- Alloy'd reads meter metadata rather than credentials.
- It does not modify the records or bypass Codex's enforcement.
- Codex is open source, reducing reverse-engineering concerns where the
  relevant serialization is visible in the licensed implementation.

Open source does not override OpenAI's service terms. The CLI license governs
the code; hosted models, ChatGPT authentication, subscription limits, and
service-generated data remain subject to OpenAI's applicable terms.

The rollout format is not a documented compatibility interface, so this adapter
is treated as local, optional, best-effort, and subject to breakage. It parses
only the minimum `rate_limits` data needed, never transmits rollout contents,
never touches credentials or conversation content, and falls back to static
routing when the data is missing, stale, or malformed.

## Service boundary

Alloy'd selects between two different services independently purchased and used
by the same person. It neither exposes those accounts to another person nor
turns their capacity into a new API product. The operator is the subscription
account holder, credentials remain in each official local CLI, execution runs
through official `claude -p` and `codex exec` processes, all data stays local,
and there is no capacity beyond the user's purchased accounts. Each official
CLI authenticates the user and continues to enforce its own permissions and
limits.

Alloy'd will not add account pooling, downstream API keys, hosted credential
custody, third-party access, quota resale, or payment handling without moving
to expressly authorized commercial/API agreements and reassessing the project's
legal, privacy, security, and regulatory obligations.

## Relevant terms

- OpenAI Terms of Use, effective 2026-01-01:
  <https://openai.com/policies/terms-of-use/>
- Using Codex with a ChatGPT plan:
  <https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan>
- Anthropic Consumer Terms:
  <https://www.anthropic.com/legal/consumer-terms>
- Using Claude Code with Pro or Max:
  <https://support.anthropic.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan>

OpenAI's consumer terms prohibit automated extraction and circumvention of rate
limits, while its Codex documentation expressly supports non-interactive,
machine-readable automation. Anthropic's consumer terms restrict automated
access unless explicitly permitted, while its Claude Code documentation
expressly supports programmatic `claude -p` use. This assessment relies on
those product-specific permissions and on Alloy'd respecting, rather than
bypassing, the providers' controls.

## Re-review triggers

This assessment will be revisited whenever:

- Anthropic or OpenAI changes its terms or CLI documentation.
- Alloy'd begins hosting requests or storing user credentials.
- An Alloy'd-rendered CLI takes over tool execution or permission decisions.
- Any empirical benchmarking or calibration capability that consumes provider
  capacity is added. Any such capability should use official APIs under metered
  commercial terms, or written provider authorization, rather than consumer
  subscriptions.
- Codex provides an official subscription-usage interface.
- Alloy'd begins reading or transmitting transcript content.
