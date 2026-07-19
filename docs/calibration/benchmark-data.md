# Benchmark dataset for default-config calibration

**To calibrate a new model:** append its rows to the relevant tables below, then
re-derive placements in the "Derived calibration" section against the existing
rows. Do not delete old rows; strike them through if a source revises them.

**Sources:** Artificial Analysis (artificialanalysis.ai — AA Intelligence Index
v4.1 and component evals, independently run), DeepSWE (deepswe.ai leaderboard),
LiveBench (livebench.ai — contamination-resistant, monthly-refreshed,
ground-truth scored).

**Notation:** effort levels in parentheses (low/medium/high/xhigh/max;
"Non-reasoning" = thinking off). `~` = estimated from a chart with no printed
value. Models relevant to alloyd's bands: Claude Opus 4.8 / Sonnet 5 /
Haiku 4.5; GPT-5.6 Sol / Terra / Luna. Claude Fable 5 rows are kept for
reference and are routable only on Claude Max and Enterprise plans; the
config-setup skill applies that plan-gated variant.

**Duplicate screenshots (no separate tables kept):** `SCR-…-ogou`, `-ohpr`,
`-ojux`, `-ojxz`, `-okex`, `-okpq` are scatter views recombining data already
in the exact-valued tables below; `SCR-…-oijc`/`-oiid` repeat the Coding/Agentic
index bars (values within ±0.5 of the kept tables, plus one extra row —
GPT-5.5 (xhigh): Coding 75, Agentic 45).

---

## 1. AA Intelligence Index v4.1 (composite of 9 evals) — `SCR-…-ogde`

Incorporates: GDPval-AA v2, τ³-Banking, Terminal-Bench v2.1, SciCode,
Humanity's Last Exam, GPQA Diamond, CritPt, AA-Omniscience, AA-LCR.

| Model | Score |
|---|---|
| Claude Fable 5 (with fallback) | 60 |
| GPT-5.6 Sol (max) | 59 |
| GPT-5.6 Sol (xhigh) | 58 |
| GPT-5.6 Sol (high) | 56 |
| Claude Opus 4.8 (max) | 56 |
| GPT-5.6 Terra (max) | 55 |
| GPT-5.6 Sol (medium) | 54 |
| Claude Sonnet 5 (max) | 53 |
| GPT-5.6 Terra (xhigh) | 52 |
| GPT-5.6 Luna (max) | 51 |
| GPT-5.6 Sol (low) | 49 |
| GPT-5.6 Luna (xhigh) | 49 |
| GPT-5.6 Terra (high) | 49 |
| GPT-5.6 Luna (high) | 46 |
| GPT-5.6 Terra (medium) | 46 |
| Claude Sonnet 5 (Non-reasoning) | 42 |
| GPT-5.6 Sol (Non-reasoning) | 41 |
| GPT-5.6 Terra (low) | 40 |
| GPT-5.6 Luna (medium) | 38 |
| GPT-5.6 Terra (Non-reasoning) | 34 |
| GPT-5.6 Luna (low) | 33 |
| Claude 4.5 Haiku | 30 |
| GPT-5.6 Luna (Non-reasoning) | 27 |

## 2. AA Coding Index (Terminal-Bench v2.1 + SciCode) — `SCR-…-ogem`

| Model | Score |
|---|---|
| GPT-5.6 Sol (xhigh) | 78.3 |
| GPT-5.6 Sol (max) | 77.4 |
| GPT-5.6 Sol (high) | 77.2 |
| GPT-5.6 Terra (max) | 76.7 |
| Claude Fable 5 (with fallback) | 76.5 |
| GPT-5.6 Sol (medium) | 76.3 |
| Claude Opus 4.8 (max) | 74.3 |
| Claude Sonnet 5 (max) | 71.5 |
| GPT-5.6 Luna (max) | 71.4 |
| GPT-5.6 Terra (xhigh) | 70.6 |
| GPT-5.6 Sol (low) | 69.7 |
| GPT-5.6 Luna (xhigh) | 68.6 |
| GPT-5.6 Terra (high) | 67.1 |
| Claude Sonnet 5 (Non-reasoning) | 66.4 |
| GPT-5.6 Sol (Non-reasoning) | 65.1 |
| GPT-5.6 Terra (medium) | 64.7 |
| GPT-5.6 Luna (high) | 63.3 |
| GPT-5.6 Terra (low) | 58.1 |
| GPT-5.6 Terra (Non-reasoning) | 52.3 |
| GPT-5.6 Luna (medium) | 50.7 |
| GPT-5.6 Luna (low) | 44.2 |
| Claude 4.5 Haiku | 43.9 |
| GPT-5.6 Luna (Non-reasoning) | 39.3 |

## 3. AA Agentic Index (GDPval-AA v2 + τ³-Banking) — `SCR-…-ogga`

| Model | Score |
|---|---|
| GPT-5.6 Sol (max) | 54.0 |
| Claude Fable 5 (with fallback) | 52.8 |
| GPT-5.6 Sol (xhigh) | 51.8 |
| GPT-5.6 Sol (high) | 48.5 |
| GPT-5.6 Terra (max) | 47.4 |
| Claude Opus 4.8 (max) | 47.2 |
| Claude Sonnet 5 (max) | 46.7 |
| GPT-5.6 Luna (max) | 45.6 |
| GPT-5.6 Terra (xhigh) | 44.7 |
| GPT-5.6 Sol (medium) | 44.5 |
| GPT-5.6 Luna (xhigh) | 42.9 |
| GPT-5.6 Terra (high) | 41.3 |
| GPT-5.6 Luna (high) | 40.1 |
| GPT-5.6 Sol (low) | 40.0 |
| GPT-5.6 Terra (medium) | 37.0 |
| GPT-5.6 Sol (Non-reasoning) | 34.9 |
| Claude Sonnet 5 (Non-reasoning) | 33.7 |
| GPT-5.6 Luna (medium) | 31.0 |
| GPT-5.6 Terra (low) | 30.6 |
| GPT-5.6 Terra (Non-reasoning) | 29.3 |
| GPT-5.6 Luna (low) | 25.4 |
| GPT-5.6 Luna (Non-reasoning) | 22.0 |
| Claude 4.5 Haiku | 16.4 |

## 4. AA domain capability indices — `SCR-…-oijy/-oikv/-oimb/-oing/-oioe/-oipd`

Composite indices over AA component evals (each column's eval mix differs; see
screenshot captions in git history if needed). Higher is better.

| Model | Finance | Strategy&Ops | Legal | Healthcare | Engineering | Economics |
|---|---|---|---|---|---|---|
| Claude Fable 5 (with fallback) | 55 | 50 | 59 | 49 | 63 | 62 |
| GPT-5.6 Sol (max) | 51 | 51 | 52 | 45 | 60 | 56 |
| GPT-5.6 Sol (xhigh) | 49 | 50 | 51 | 44 | 58 | 54 |
| Claude Opus 4.8 (max) | 48 | 43 | 50 | 44 | 57 | 56 |
| GPT-5.6 Sol (high) | 48 | 48 | 49 | 43 | 57 | 53 |
| GPT-5.5 (xhigh) | 46 | 47 | 48 | 41 | 55 | 53 |
| GPT-5.6 Sol (medium) | 46 | 46 | 47 | 40 | 55 | 51 |
| Claude Sonnet 5 (max) | 44 | — | 45 | 41 | 55 | 52 |
| GPT-5.6 Terra (max) | 44 | 44 | 44 | 39 | 55 | 49 |
| GPT-5.6 Sol (low) | 43 | 43 | 45 | 39 | 51 | 49 |
| GPT-5.6 Terra (xhigh) | 42 | 41 | 42 | 38 | 53 | 47 |
| GPT-5.6 Luna (max) | 41 | — | 39 | 36 | 51 | 46 |
| GPT-5.6 Terra (high) | 40 | 39 | 41 | 36 | 51 | 46 |
| GPT-5.6 Luna (xhigh) | 40 | — | 38 | 35 | 50 | 44 |
| GPT-5.6 Luna (high) | 37 | — | 36 | 32 | 48 | 42 |
| GPT-5.6 Terra (medium) | 36 | 36 | 38 | 33 | 47 | 42 |
| GPT-5.6 Sol (Non-reasoning) | 34 | — | 35 | 32 | 43 | 36 |
| Claude Sonnet 5 (Non-reasoning) | 32 | — | 34 | 31 | 43 | 39 |
| GPT-5.6 Terra (low) | 33 | 33 | 34 | 30 | 43 | 39 |
| GPT-5.6 Luna (medium) | 32 | — | 32 | 28 | 41 | 37 |
| GPT-5.6 Luna (low) | 28 | — | 29 | 25 | 38 | 33 |
| GPT-5.6 Terra (Non-reasoning) | 26 | — | 26 | 25 | 36 | 28 |
| Claude 4.5 Haiku | 21 | 19 | 25 | 22 | 32 | 34 |
| GPT-5.6 Luna (Non-reasoning) | 21 | — | 22 | 20 | 31 | 25 |

## 5. AA component evals — `SCR-…-onbz/-ondz/-ongj/-onjz/-okvv/-okyk/-omzm`

HLE = Humanity's Last Exam; GPQA = GPQA Diamond; TB = Terminal-Bench v2.1;
τ³ = τ³-Banking; LCR = AA-LCR long-context reasoning. All %.

| Model | HLE | GPQA | CritPt | LCR | τ³ | TB v2.1 | SciCode |
|---|---|---|---|---|---|---|---|
| Claude Fable 5 (with fallback) | 53.3 | 92.6 | 28.6 | 70.0 | 26.8 | 84.6 | 60.2 |
| GPT-5.6 Sol (max) | 47.2 | 94.1 | 32.3 | 73.7 | 33.0 | 88.0 | 56.1 |
| GPT-5.6 Sol (xhigh) | 44.7 | 93.1 | 28.6 | 71.0 | 32.6 | 89.5 | 56.0 |
| GPT-5.6 Sol (high) | 44.1 | 92.8 | 25.7 | 68.3 | 30.6 | 87.3 | 56.9 |
| GPT-5.6 Sol (medium) | 39.7 | 92.6 | 22.9 | 68.7 | 26.5 | 86.1 | 56.5 |
| GPT-5.6 Sol (low) | 36.6 | 89.8 | 14.9 | 67.7 | 24.4 | 76.8 | 55.4 |
| GPT-5.6 Sol (Non-reasoning) | 15.8 | 79.0 | 5.1 | 55.3 | 16.1 | 74.2 | 47.1 |
| Claude Opus 4.8 (max) | 45.7 | 92.0 | 20.9 | 67.7 | 27.6 | 84.6 | 53.5 |
| Claude Sonnet 5 (max) | 39.6 | 91.1 | 16.9 | 70.7 | 28.2 | 80.5 | 53.6 |
| Claude Sonnet 5 (Non-reasoning) | 17.8 | 80.0 | 1.1 | 58.7 | 14.0 | 75.3 | 48.6 |
| Claude 4.5 Haiku | 9.7 | 67.2 | 0.0 | 70.3 | 9.1 | 44.2 | 43.3 |
| GPT-5.6 Terra (max) | 41.8 | 92.5 | 30.0 | 74.0 | 31.8 | 88.0 | 53.9 |
| GPT-5.6 Terra (xhigh) | 40.0 | 90.8 | 27.1 | 71.3 | 24.3 | 80.1 | 51.6 |
| GPT-5.6 Terra (high) | 36.7 | 89.6 | 22.9 | 72.3 | 22.3 | 75.7 | 50.1 |
| GPT-5.6 Terra (medium) | 31.6 | 87.2 | 17.4 | 68.0 | 19.4 | 72.3 | 49.7 |
| GPT-5.6 Terra (low) | 27.4 | 84.3 | 9.4 | 64.3 | 16.1 | 62.5 | 49.2 |
| GPT-5.6 Terra (Non-reasoning) | 11.0 | 74.6 | 2.0 | 50.0 | 13.4 | 56.2 | 45.8 |
| GPT-5.6 Luna (max) | 37.2 | 91.1 | 20.6 | 74.0 | 27.2 | 80.9 | 52.5 |
| GPT-5.6 Luna (xhigh) | 35.6 | 89.5 | 20.6 | 69.7 | 24.3 | 77.9 | 50.0 |
| GPT-5.6 Luna (high) | 31.6 | 89.2 | 16.6 | 69.0 | 22.3 | 69.7 | 50.7 |
| GPT-5.6 Luna (medium) | 24.5 | 85.9 | 4.9 | 66.0 | 15.3 | 53.2 | 45.6 |
| GPT-5.6 Luna (low) | 18.8 | 83.5 | 2.6 | 59.3 | 12.0 | 43.4 | 44.6 |
| GPT-5.6 Luna (Non-reasoning) | 6.7 | 64.5 | 0.3 | 36.3 | 9.1 | 39.0 | 39.9 |

## 6. AA-Omniscience (knowledge + hallucination) — `SCR-…-ojko/-ojlu/-ojoh`

Index range −100..100 (0 = as many right as wrong). Hallucination Rate =
incorrect / all non-correct responses, **lower is better**. GPT bar-to-label
pairing in the hallucination chart was partly ambiguous (85–94% cluster).

| Model | Index | Accuracy | Halluc. Rate |
|---|---|---|---|
| Claude Fable 5 (with fallback) | 40 | 61% | 55% |
| Claude Opus 4.8 (max) | 27 | 47% | 36% |
| Claude Sonnet 5 (max) | 15 | 38% | 37% |
| Claude Sonnet 5 (Non-reasoning) | −1 | 33% | 50% |
| Claude 4.5 Haiku | −4 | 17% | 26% |
| GPT-5.6 Sol (max) | 22 | 59% | 89% |
| GPT-5.6 Sol (xhigh) | 21 | 58% | 89% |
| GPT-5.6 Sol (high) | 20 | 57% | 88% |
| GPT-5.6 Sol (medium) | 19 | 57% | 87% |
| GPT-5.6 Sol (low) | 18 | 56% | 87% |
| GPT-5.6 Sol (Non-reasoning) | 1 | 48% | 91% |
| GPT-5.6 Terra (max) | 0 | 46% | 85% |
| GPT-5.6 Terra (xhigh) | −3 | 45% | 87% |
| GPT-5.6 Terra (high) | −4 | 44% | 87% |
| GPT-5.6 Terra (medium) | −5 | 44% | 88% |
| GPT-5.6 Terra (low) | −7 | 43% | 88% |
| GPT-5.6 Terra (Non-reasoning) | −23 | 36% | 94% |
| GPT-5.6 Luna (max) | −11 | 42% | 90% |
| GPT-5.6 Luna (xhigh) | −12 | 41% | 90% |
| GPT-5.6 Luna (high) | −12 | 41% | 90% |
| GPT-5.6 Luna (medium) | −14 | 40% | 89% |
| GPT-5.6 Luna (low) | −15 | 39% | 88% |
| GPT-5.6 Luna (Non-reasoning) | −25 | 28% | 73% |

## 7. GDPval-AA v2 (real-world work, Elo, human = 1000) — `SCR-…-ojpl`

| Model | Elo |
|---|---|
| Claude Fable 5 (with fallback) | 1760 |
| GPT-5.6 Sol (max) | 1743 |
| GPT-5.6 Sol (xhigh) | 1702 |
| GPT-5.6 Sol (high) | 1630 |
| Claude Sonnet 5 (max) | 1607 |
| Claude Opus 4.8 (max) | 1600 |
| GPT-5.6 Terra (max) | 1593 |
| GPT-5.6 Luna (max) | 1592 |
| GPT-5.6 Terra (xhigh) | 1572 |
| GPT-5.6 Sol (medium) | 1562 |
| GPT-5.6 Luna (xhigh) | 1539 |
| GPT-5.6 Terra (high) | 1513 |
| Claude Sonnet 5 (xhigh) | 1511 |
| GPT-5.6 Luna (high) | 1472 |
| GPT-5.6 Sol (low) | 1445 |
| GPT-5.6 Terra (medium) | 1404 |
| Claude Sonnet 5 (high) | 1403 |
| GPT-5.6 Sol (Non-reasoning) | 1384 |
| Claude Sonnet 5 (Non-reasoning) | 1372 |
| Claude Sonnet 5 (medium) | 1304 |
| GPT-5.6 Luna (medium) | 1272 |
| GPT-5.6 Terra (low) | 1249 |
| GPT-5.6 Terra (Non-reasoning) | 1239 |
| Claude Sonnet 5 (low) | 1217 |
| GPT-5.6 Luna (low) | 1146 |
| GPT-5.6 Luna (Non-reasoning) | 1068 |
| Claude 4.5 Haiku | 907 |

## 8. AA-Briefcase (long-horizon knowledge work) — `SCR-…-ojfx/-ojjh`

| Model | Elo | Rubric % |
|---|---|---|
| Claude Fable 5 (with fallback) | 1583 | 56.0 |
| GPT-5.6 Sol (max) | 1496 | 41.8 |
| Claude Sonnet 5 (max) | 1388 | 42.3 |
| Claude Opus 4.8 (max) | 1354 | 38.7 |
| Claude Sonnet 5 (xhigh) | 1298 | 40.0 |
| Claude Sonnet 5 (high) | 1199 | 35.5 |
| Claude Sonnet 5 (medium) | 1059 | 29.1 |
| Claude Sonnet 5 (low) | 926 | 24.6 |
| Claude 4.5 Haiku | 603 | 10.8 |

## 9. Harvey LAB-AA (legal, all-pass grading) — `SCR-…-onun`

| Model | All-pass rate |
|---|---|
| Claude Fable 5 (with fallback) | 14.2% |
| Claude Opus 4.8 (max) | 7.5% |
| GPT-5.6 Luna (max) | 5.0% |
| Claude Sonnet 5 (max) | 5.0% |
| GPT-5.6 Terra (max) | 2.5% |
| GPT-5.6 Sol (max) | 1.7% |
| Claude 4.5 Haiku | 0.0% |

## 10. AA Coding Agent Index (DeepSWE + TB v2 + SWE-Atlas-QnA, in-harness) — `SCR-…-ohrl/-ogrd/-ohss`

Run inside real agent harnesses (Claude Code / Codex). Cost = pay-per-token
API cost per task; time = wall time per task. The two "$0" Sol rows are as
displayed on the source (likely rounding/display error).

| Model (agent) | Score | Cost/task | Time/task |
|---|---|---|---|
| GPT-5.6 Sol (max) (Codex) | 80 | $7.08 | 10.2m |
| GPT-5.6 Sol (xhigh) (Codex) | 79 | $0 (sic) | 7.4m |
| GPT-5.6 Terra (max) (Codex) | 77 | $2.76 | 8.4m |
| Claude Fable 5 (max, w/ fallback) (Claude Code) | 77 | $11.7 | 23.4m |
| GPT-5.6 Sol (high) (Codex) | 77 | $0 (sic) | 6.3m |
| GPT-5.6 Luna (max) (Codex) | 75 | $1.57 | 8.0m |
| GPT-5.6 Terra (xhigh) (Codex) | 73 | $1.90 | 6.9m |
| Claude Opus 4.8 (max) (Claude Code) | 73 | $7.70 | 23.1m |
| GPT-5.6 Terra (high) (Codex) | 72 | $1.59 | 6.2m |
| GPT-5.6 Luna (xhigh) (Codex) | 71 | $1.26 | 6.6m |
| GPT-5.6 Luna (high) (Codex) | 68 | $0.96 | 5.7m |
| Claude Opus 4.8 (medium) (Claude Code) | 67 | $3.26 | 12.4m |
| GPT-5.6 Terra (medium) (Codex) | 64 | $0.90 | 4.3m |
| GPT-5.6 Luna (medium) (Codex) | 59 | $0.47 | 3.4m |
| GPT-5.6 Luna (low) (Codex) | 42 | $0.21 | 1.9m |

## 11. DeepSWE leaderboard (pass@1, deepswe.ai) — `deepswe.png`

Only benchmark with full effort ladders for BOTH vendors' coding models.

| Model [effort] | Pass@1 | Avg cost | Out tok | Steps |
|---|---|---|---|---|
| gpt-5.6-sol [max] | 73% ±3% | $8.39 | 60k | 61 |
| gpt-5.6-sol [xhigh] | 71% ±1% | $4.70 | 41k | 44 |
| claude-fable-5 [xhigh] | 70% ±3% | $13.41 | 80k | 68 |
| claude-fable-5 [max] | 70% ±4% | $21.63 | 119k | 88 |
| gpt-5.6-terra [max] | 70% ±3% | $4.95 | 72k | 76 |
| gpt-5.6-sol [high] | 69% ±1% | $3.47 | 28k | 37 |
| claude-fable-5 [high] | 69% ±1% | $9.18 | 57k | 59 |
| gpt-5.6-luna [max] | 67% ±4% | $3.03 | 73k | 102 |
| claude-fable-5 [medium] | 65% ±4% | $6.09 | 40k | 48 |
| gpt-5.6-sol [medium] | 61% ±2% | $1.86 | 18k | 31 |
| gpt-5.6-terra [xhigh] | 60% ±2% | $2.13 | 40k | 43 |
| claude-fable-5 [low] | 60% ±3% | $3.76 | 25k | 38 |
| claude-opus-4.8 [max] | 59% ±2% | $13.22 | 135k | 120 |
| gpt-5.6-luna [xhigh] | 57% ±2% | $1.54 | 45k | 71 |
| claude-opus-4.8 [xhigh] | 54% ±4% | $8.01 | 86k | 95 |
| claude-sonnet-5 [max] | 54% ±4% | $26.40 | 214k | 268 |
| gpt-5.6-terra [high] | 54% ±4% | $1.13 | 22k | 34 |
| claude-opus-4.8 [high] | 52% ±5% | $4.28 | 50k | 73 |
| claude-sonnet-5 [xhigh] | 50% ±3% | $11.89 | 121k | 186 |
| claude-opus-4.8 [medium] | 49% ±2% | $3.44 | 41k | 66 |
| claude-sonnet-5 [high] | 48% ±5% | $7.43 | 87k | 147 |
| gpt-5.6-sol [low] | 45% ±2% | $1.07 | 11k | 23 |
| gpt-5.6-luna [high] | 44% ±3% | $0.78 | 26k | 49 |
| claude-opus-4.8 [low] | 41% ±1% | $2.29 | 29k | 54 |
| claude-sonnet-5 [medium] | 40% ±3% | $4.08 | 57k | 108 |
| gpt-5.6-terra [medium] | 35% ±3% | $0.58 | 12k | 25 |
| claude-sonnet-5 [low] | 31% ±1% | $2.19 | 36k | 77 |
| gpt-5.6-terra [low] | 24% ±1% | $0.43 | 8.6k | 21 |
| gpt-5.6-luna [medium] | 11% ±1% | $0.22 | 8.2k | 24 |
| gpt-5.6-luna [low] | 2% ±1% | $0.07 | 3.1k | 12 |

## 12. LiveBench (livebench.ai, truncated top rows) — `livebench-anthropic/-openai.png`

Columns: Overall / Reasoning / Coding / Agentic Coding / Math / Data Analysis /
Language / Instruction Following / cost per successful task. Both screenshots
are cropped — more rows exist below.

| Model | Overall | Rsn | Code | AgCode | Math | Data | Lang | IF | $/succ |
|---|---|---|---|---|---|---|---|---|---|
| GPT-5.6 Sol Max | 82.4 | 91.7 | 83.9 | 65.6 | 96.2 | 79.8 | 87.7 | 71.8 | $0.589 |
| Claude Fable 5 Max | 80.8 | 89.7 | 86.0 | 46.9 | 96.0 | 80.5 | 90.7 | 75.8 | $1.573 |
| GPT-5.5 Thinking xHigh | 79.9 | 89.7 | 82.1 | 52.1 | 95.9 | 81.6 | 87.4 | 70.7 | $0.530 |
| GPT-5.6 Terra Max | 79.8 | 90.6 | 78.2 | 68.0 | 94.9 | 79.3 | 82.9 | 64.6 | $0.497 |
| GPT-5.6 Sol xHigh | 79.7 | 90.2 | 81.8 | 56.6 | 95.5 | 80.3 | 85.9 | 67.4 | $0.355 |
| Claude Fable 5 xHigh | 79.5 | 87.7 | 82.5 | 50.7 | 95.7 | 78.7 | 89.5 | 72.0 | $0.811 |
| Claude 4.8 Opus Thinking xHigh | 78.9 | 89.7 | 79.3 | 56.1 | 95.3 | 78.3 | 81.4 | 72.4 | $0.688 |
| GPT-5.5 Thinking High | 78.8 | 89.7 | 80.0 | 46.8 | 95.2 | 80.4 | 87.8 | 71.4 | $0.367 |
| GPT-5.4 Thinking xHigh | 78.0 | 88.1 | 77.5 | 53.8 | 94.1 | 79.3 | 82.6 | 70.2 | $0.387 |
| Claude 4.7 Opus Thinking xHigh | 76.5 | 87.2 | 82.1 | 50.7 | 92.9 | 78.3 | 77.9 | 66.7 | $0.528 |
| Claude Sonnet 5 xHigh | 74.8 | 88.7 | 80.7 | 51.1 | 92.9 | 71.7 | 75.0 | 63.9 | $0.492 |
| GPT-5.2 High | 74.6 | 83.2 | 76.1 | 50.3 | 93.2 | 78.2 | 79.8 | 61.8 | $0.234 |
| GPT-5.6 Luna Max | 74.3 | 85.6 | 82.9 | 53.8 | 87.2 | 78.0 | 72.6 | 60.1 | $0.202 |
| GPT-5.6 Terra xHigh | 74.3 | 84.9 | 75.4 | 53.3 | 89.5 | 77.4 | 79.9 | 59.4 | $0.208 |
| GPT-5.2 Codex | 74.0 | 77.7 | 83.6 | 49.4 | 88.8 | 78.2 | 73.7 | 66.4 | $0.187 |
| GPT-5.5 | 72.2 | 87.3 | 78.6 | 41.1 | 69.8 | 77.0 | 85.6 | 65.7 | $0.212 |
| GPT-5.6 Luna xHigh | 71.0 | 84.7 | 76.7 | 48.8 | 86.3 | 72.9 | 70.2 | 57.4 | $0.123 |

## 13. Operational metrics (AA) — `SCR-…-ognk/-ogpw/-okit/-okkn/-okmi/-ojsv`

Cost = per Intelligence-Index task; Time = decode minutes per task;
Speed = output tok/s; Latency = seconds to first answer token (incl. thinking);
E2E = seconds for a 500-token response; OutTok = output tokens per task.
Mid-range latency/E2E label pairings (staggered chart labels) are best-effort.

| Model | Cost/task | Time/task | Speed | Latency | E2E | OutTok |
|---|---|---|---|---|---|---|
| Claude Fable 5 (w/ fallback) | $2.75 | 5.0m | 67 | 148.1 | 155.6 | 33k |
| Claude Opus 4.8 (max) | $1.80 | 7.4m | 57 | 41.0 | 49.7 | 41k |
| Claude Sonnet 5 (max) | $1.53 | 7.8m | 90 | 200.4 | 206.0 | 69k |
| Claude Sonnet 5 (xhigh) | — | — | 70 | 29.7 | 36.8 | — |
| Claude Sonnet 5 (high) | — | — | 65 | 10.7 | 21.0 | — |
| Claude Sonnet 5 (medium) | — | — | 64 | 2.7 | 10.5 | — |
| Claude Sonnet 5 (low) | — | — | 62 | 2.0 | 10.1 | — |
| Claude Sonnet 5 (Non-reasoning) | $0.37 | 1.6m | 63 | 1.4 | 9.3 | 10k |
| Claude 4.5 Haiku | $0.27 | 3.2m | 90 | 21.7 | 27.2 | 24k |
| GPT-5.6 Sol (max) | $1.04 | 4.6m | 55 | 138.6 | 147.7 | 15k |
| GPT-5.6 Sol (xhigh) | $0.68 | 2.9m | 55 | 44.6 | 53.7 | 10k |
| GPT-5.6 Sol (high) | $0.45 | 2.1m | 51 | 13.3 | 20.5 | 7k |
| GPT-5.6 Sol (medium) | $0.31 | 1.3m | 54 | 4.8 | 14.1 | 4k |
| GPT-5.6 Sol (low) | $0.20 | 0.8m | 52 | 3.7 | 13.3 | 3k |
| GPT-5.6 Sol (Non-reasoning) | $0.20 | 0.6m | 56 | 1.1 | 10.1 | 2k |
| GPT-5.6 Terra (max) | $0.55 | 2.2m | 145 | 137.5 | 140.9 | 19k |
| GPT-5.6 Terra (xhigh) | $0.33 | 1.4m | 134 | 17.9 | 21.6 | 11k |
| GPT-5.6 Terra (high) | $0.24 | 1.0m | 134 | 2.4 | 6.1 | 8k |
| GPT-5.6 Terra (medium) | $0.13 | 0.5m | 128 | 1.5 | 5.4 | 4k |
| GPT-5.6 Terra (low) | $0.10 | 0.3m | 128 | 1.4 | 5.4 | 2k |
| GPT-5.6 Terra (Non-reasoning) | $0.05* | 0.3m | 125 | 0.8 | 4.8 | 2k |
| GPT-5.6 Luna (max) | $0.21 | 1.6m | 199 | 111.3 | 113.8 | 19k |
| GPT-5.6 Luna (xhigh) | $0.14 | 1.2m | 179 | 29.7 | 32.5 | 12k |
| GPT-5.6 Luna (high) | $0.09 | 0.8m | 173 | 8.3 | 11.2 | 8k |
| GPT-5.6 Luna (medium) | $0.05 | 0.4m | 172 | 2.1 | 5.0 | 4k |
| GPT-5.6 Luna (low) | $0.04 | 0.2m | 174 | 1.4 | 4.2 | 2k |
| GPT-5.6 Luna (Non-reasoning) | $0.05 | 0.2m | 180 | 0.6 | 3.4 | 2k |

*Terra Non-reasoning cost row not shown in the cost chart; nearest value.

---

# Derived calibration (2026-07-17)

## Fable 5 recalibration (2026-07-18)

The shipped `config/default.json` remains universal: Opus ↔ Sol frontier,
Sonnet ↔ Terra value, Haiku ↔ Luna cheap. The config-setup skill asks for the
Claude plan and, on Max or Enterprise, applies the Fable variant below; Fable
5 is a plan feature, not additional capacity.

- **Frontier: Fable 5 ↔ Sol.** Replace frontier's Claude model with
  `claude-fable-5`; Fable's Intelligence Index 60 vs Sol's 59, GDPval 1760 vs
  1743, and Coding Agent Index 77 vs 80 keep them in the same band. Opus 4.8
  (Intelligence 56) no longer pairs with Sol when Fable is available.
- **deep-review: Claude-only Opus 4.8.** Add
  `{ claude: claude-opus-4-8 }` so Opus-based roles remain valid under
  `parseConfig`. It is deliberately unpaired: `substitute()` reports an
  unpaired band; `selectRoute` stays on Claude with its warning.
- **Reviewer stays Opus by default.** Keep `claude-opus-4-8/high`: its
  hallucination rate is 36% vs Fable's 55%, and it burns less Claude meter
  ($1.80/7.4m per task vs Fable's $2.75/5.0m; Fable's in-harness coding time is
  23.4m). Present `claude-fable-5/high` as the pricier reviewer alternative.
- **Pro and Team remain unchanged.** Do not add Fable: their shipped bands are
  Opus ↔ Sol, Sonnet ↔ Terra, and Haiku ↔ Luna, and a Fable dispatch would
  fail on those plans.
- **Builder failover improves on Max and Enterprise.** When Codex is hot,
  `gpt-5.6-sol/medium` substitutes to `claude-fable-5/medium` (DeepSWE 65% vs
  Sol's 61%), replacing the Opus-medium fallback at 49%.

## Band validation — bands CONFIRMED as configured

- **frontier: opus-4.8 ↔ sol.** Intelligence 56 vs 59, coding-agent 73 vs 80,
  GDPval 1600 vs 1743 (all at max). Sol slightly ahead on most axes; Opus ahead
  on knowledge reliability (Omniscience 27 vs 22, hallucination 36% vs 89%) and
  Harvey legal (7.5% vs 1.7%). Same band.
- **value: sonnet-5 ↔ terra.** Intelligence 53 vs 55, GDPval 1607 vs 1593,
  τ³ 28.2 vs 31.8 at max. Same band. Caveat: at *matched effort names* Terra
  beats Sonnet badly on agentic coding (DeepSWE terra-high 54% vs sonnet-high
  48% at 1/6 the cost) — Sonnet only matches Terra at max effort.
- **cheap: haiku-4.5 ↔ luna.** Haiku 30 vs Luna 27–51 (effort-dependent). Luna
  at high+ clearly outclasses Haiku (coding 63.3 vs 43.9, agentic 40.1 vs
  16.4); Haiku's only wins are hallucination rate (26%) and AA-LCR (70.3).
  Same band only if Luna runs ≤medium; Luna high+ is closer to the value band.

## Cross-vendor effort equivalence (for `substitute()` intuition)

Claude models burn 2–10× the output tokens of GPT-5.6 peers at the same
score (e.g. Sonnet max 69k tok vs Terra max 19k for ~equal intelligence).
On subscription meters this means Claude-side dispatches cost more headroom
per unit of quality — mildly favor Codex for high-volume roles when meters
are level.

## Default role map (applied to `config/default.json`)

- **planner: claude sonnet-5, effort high** (was medium). GDPval sonnet-medium
  1304 is bottom-quartile; high (1403) is the knee of Sonnet's curve — xhigh
  (1511) costs 3× latency (10.7s→29.7s first-token) for +100 Elo. Planning
  output is judgment-dense and low-volume, so the bump is cheap in absolute
  meter burn.
- **builder: codex gpt-5.6-sol, effort medium** (was terra medium). Terra
  medium is a coding trap: DeepSWE 35%, coding index 64.7. Sol medium scores
  76.3 coding / 61% DeepSWE / 86.1% Terminal-Bench — within 2 points of Sol
  xhigh — at $0.31/task and 4k output tokens. Best quality-per-meter-burn
  point on either vendor's ladder. Alternative if Sol headroom is tight:
  terra high (DeepSWE 54%, $1.13) — noted, not default.
- **reviewer: claude claude-opus-4-8, effort high** (unchanged). Review is
  hallucination-sensitive: every GPT-5.6 config hallucinates at 85–94% vs
  Opus 36%. Opus also leads Harvey all-pass and Omniscience Index. Data
  confirms the existing choice.

## Signal-quality notes

- Weak/ignored signals: Harvey LAB-AA (legal-only, 7 models), AA-Briefcase
  (mostly Claude ladder, one GPT point), domain indices (heavy eval overlap
  with the Intelligence Index — same 4–6 components reshuffled).
- Strongest signals for routing: DeepSWE (full effort ladders both vendors,
  cost+tokens per row), AA Coding/Agentic indices, GDPval Elo, and the
  operational table (§13) for meter-burn reasoning.
- Fable 5 is routable only through the config-setup Max/Enterprise variant;
  the shipped default remains plan-universal.
