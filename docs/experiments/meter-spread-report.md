# Meter-spread experiment report

Generated 2026-07-23 from 26 logged sessions (20 usable, 6 excluded).

## Method

Real work sessions, each randomly assigned to an arm before starting:
**control** (all work inline on the driving CLI, no dispatching) or
**routed** (normal Alloy'd dispatching of substantial work units).
Usage snapshots of both providers' subscription meters were taken at
session start and end; burn is the diff between snapshots on matching
rate-limit windows (matched by reset timestamp). Percentages are of the
provider's own limit window (Claude Max 5x 5-hour window; Codex/ChatGPT
Plus weekly window). Sessions where a window rolled over mid-leg, the
usage cache went stale, or the session was scrapped are excluded.

## Results

| Arm | Sessions | Work units | Claude burn %/WU | Codex burn %/WU | Codex share of burn |
|---|---|---|---|---|---|
| Control (all inline) | 12 | 14 | 4.0% | 0.1% | 1.8% |
| Routed, ≥1 dispatch | 6 | 9 | 3.8% | 1.4% | 27.7% |
| Routed, ≥2 dispatches | 2 | 5 | 3.2% | 2.0% | 38.5% |
| Routed, 0 dispatches | 2 | 2 | 2.0% | 0.0% | 0.0% |

## Per-session data (usable rows)

| Started | Arm | Difficulty | Driver | Dispatches | Work units | ΔClaude | ΔCodex |
|---|---|---|---|---|---|---|---|
| 2026-07-19 16:03 | control | medium | claude-fable-5 | 0 | 1 | 7.0% | 0.0% |
| 2026-07-19 18:35 | control | medium | claude-opus-4-8 | 0 | 1 | 8.0% | 0.0% |
| 2026-07-19 19:09 | control | medium | claude-fable-5 | 0 | 1 | 6.0% | 0.0% |
| 2026-07-19 20:01 | control | medium | claude-fable-5 | 0 | 1 | 10.0% | 0.0% |
| 2026-07-19 20:45 | control | easy | claude-opus-4-8 | 0 | 1 | 0.0% | 0.0% |
| 2026-07-19 20:58 | routed | medium | claude-fable-5 | 1 | 1 | 7.0% | 2.0% |
| 2026-07-19 21:21 | control | medium | claude-fable-5 | 0 | 1 | 7.0% | 0.0% |
| 2026-07-19 22:45 | control | easy | claude-opus-4-8 | 0 | 1 | 1.0% | 0.0% |
| 2026-07-19 22:54 | routed | medium | claude-fable-5 | 1 | 1 | 6.0% | 0.0% |
| 2026-07-20 00:15 | routed | hard | claude-fable-5 | 4 | 2 | 13.0% | 9.0% |
| 2026-07-21 01:41 | control | medium | claude-opus-4-8 | 0 | 1 | 2.0% | 1.0% |
| 2026-07-21 23:57 | control | medium | claude-fable-5 | 0 | 1 | 3.0% | 0.0% |
| 2026-07-22 00:22 | routed | easy | claude-fable-5 | 3 | 3 | 3.0% | 1.0% |
| 2026-07-22 00:42 | control | medium | claude-fable-5 | 0 | 3 | 7.0% | 0.0% |
| 2026-07-22 03:12 | control | medium | claude-fable-5 | 0 | 1 | 2.0% | 0.0% |
| 2026-07-22 03:45 | routed | medium | claude-fable-5 | 1 | 1 | 3.0% | 0.0% |
| 2026-07-22 03:55 | routed | medium | claude-fable-5 | 1 | 1 | 2.0% | 1.0% |
| 2026-07-22 04:05 | routed | medium | claude-fable-5 | 0 | 0 | 2.0% | 0.0% |
| 2026-07-22 17:03 | routed | medium | claude-fable-5 | 0 | 1 | 2.0% | 0.0% |
| 2026-07-22 18:48 | control | medium | claude-fable-5 | 0 | 1 | 3.0% | 0.0% |

## Excluded rows

- 2026-07-19 16:18 (control): window rollover
- 2026-07-19 22:24 (routed): window rollover
- 2026-07-19 23:21 (control): scrapped
- 2026-07-20 16:40 (routed): stale usage cache
- 2026-07-20 18:00 (routed): stale usage cache
- 2026-07-22 04:54 (routed): stale usage cache

## Caveats

- Small n throughout; the multi-dispatch bucket in particular rests on few sessions.
- Total burn per work unit is slightly higher when routed — expected: Alloy'd load-balances across two subscriptions, it does not reduce total compute.
- Meters are each provider's own reported usage; nothing is bypassed or estimated.
- Sessions were real day-to-day work across several projects, not a synthetic benchmark workload.
