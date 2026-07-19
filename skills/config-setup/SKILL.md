---
name: config-setup
description: Set up or update the alloyd config — personalize routing roles as (band, effort) points on the benchmark-derived quality-vs-burn defaults. Use at first install, when a new model releases, or when the user wants to add/rename/re-tune routing roles.
---

# alloyd config-setup

You are personalizing the alloyd configuration. Roles are the USER'S OWN
aliases over (band, effort) points on the benchmark-derived band ladder —
there is no required role set. The planner/builder/reviewer entries in the
shipped config are illustrative examples, not a taxonomy.

## Ground rules (all load-bearing)

1. **Opt-in before history.** Never read session transcripts, usage files,
   or rollout logs until the user explicitly agrees. Offer it; a "no"
   degrades gracefully to questions.
2. **Approval before write.** Show the full proposed config and get an
   explicit yes before writing anything.
3. **Validate before save.** Run the written candidate through the router's
   `parseConfig` (`node -e` against `src/config.ts`) — an invalid config
   never lands.
4. **Idempotent writes.** Rewrite the whole config file atomically after
   backing up the existing one to `<path>.bak.<timestamp>` (same pattern as
   scripts/setup-codex.mjs). Preserve the user's `dispatch` templates and
   any roles you are not changing.

## Locate the pieces

- Config path: `$ALLOYD_CONFIG` if set, else `config/default.json` in
  the alloyd repo.
- The resolved config path may be an indirection symlink (e.g. an
  `active.json` pointing at the mode's real file). Check with `ls -la`
  and always edit the real target file — editing tools may refuse
  symlinks, and replacing one with a plain file silently breaks
  mode-switching.
- Band data: the shipped `config/default.json` bands, set manually from
  published benchmarks (no measured curves — placements rest on the band
  ordering and effort ladder; say so when quoting tradeoffs).
- Before proposing bands, ask which Claude plan the user has: Pro/Team or
  Max/Enterprise. Fable 5 is dispatchable only on Max/Enterprise. For
  Max/Enterprise, offer the Fable variant: replace frontier's Claude model
  with `claude-fable-5` and add the Claude-only `deep-review` band
  `{ claude: claude-opus-4-8 }` to keep Opus-based roles valid; flag
  `deep-review` as unpaired under step 4. For Pro/Team, keep shipped bands and
  do not add Fable — dispatch would fail. For reviewer roles, keep Opus by
  default and show `claude-fable-5/high` as the pricier alternative under
  step 3's tradeoff pattern.

## Scenario A — first-time setup

1. Ask the user's Claude plan before proposing bands; on Max/Enterprise,
   include the Fable variant above. Then ask whether the user wants
   data-informed proposals (opt-in): with
   consent, read recent activity — Claude side `~/.claude/usage-status.json`
   and recent session transcripts; Codex side recent
   `~/.codex/sessions/**/rollout-*.jsonl`. Look for: how often work is
   dispatched vs done inline, typical task size/complexity, dominant work
   kinds (coding, review, writing, planning), vendor lean.
2. Propose 2-5 roles NAMED IN THE USER'S TERMS from what you saw (or, cold
   start, ask: "what kinds of work do you dispatch often enough to name?").
3. For each role, propose a (band, effort) point and SHOW THE TRADEOFF
   before asking: present the band ladder with one cheaper and one pricier
   alternative and the reasoning (benchmark standing, meter burn) — e.g.
   "review-work: band-1/high (strongest, heaviest burn) vs band-2/medium
   (cheaper, weaker on hard reviews). Proposed band-1/high — move it?"
4. Unpaired bands: if a role lands on a band flagged `unpaired`, tell the
   user failover to the other vendor from that role is a real downgrade
   (or refusal) and confirm they accept that.
5. Assemble `{roles, bands, dispatch}`: roles from the confirmed points
   (each `{vendor, model, effort}` — vendor = the band member the user
   leans toward, or the cheaper-meter side if indifferent); bands from the
   existing config's bands (renamed if the user wants); dispatch preserved
   verbatim from the existing config.
6. Show the diff vs the current config, get approval, back up, write,
   validate via `parseConfig`, report the path written.

## Scenario B — new-model-release update

1. Identify the new model(s): ask, and/or read what the CLIs know (Codex
   `~/.codex/models_cache.json` if present; `claude --help`/docs for the
   Claude list). Auto-detection is a nicety — asking is fine.
   Ask the user's Claude plan before proposing Fable bands: use the Fable
   variant above only on Max/Enterprise; Pro/Team keep shipped bands.
2. Place the new model from published benchmarks: pull the alloyd
   project's latest released bands (git pull of the repo / plugin update)
   or reason from public benchmark results, slot the new model in, and
   re-confirm role placements that shift.
3. Update bands (the new model joins its assumed band — one-sided
   if it has no peer), re-point any roles the user wants moved, then the
   same diff → approval → backup → write → validate flow as Scenario A.

## What NOT to do

- Do not invent quality/burn numbers — there are no measured curves.
- Do not touch dispatch templates unless the user asks.
- Do not write per-workflow roles the user didn't name — no taxonomy.
