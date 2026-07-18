const HOT_PERCENT = 80; // a meter at/above this is "hot"
function normalizeResetsAt(value) {
    const resetsAt = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Date.parse(value) / 1000
            : 0;
    return Number.isNaN(resetsAt) ? 0 : resetsAt;
}
export function parseClaudeUsage(json) {
    const d = JSON.parse(json);
    const rl = d.rate_limits ?? {};
    const windows = [];
    for (const w of Object.values(rl)) {
        if (w && typeof w.used_percentage === "number") {
            windows.push({ usedPercent: w.used_percentage, resetsAt: normalizeResetsAt(w.resets_at) });
        }
    }
    return { vendor: "claude", windows, freshnessTs: d.ts ?? 0 };
}
export function parseCodexUsage(jsonl) {
    // Rollout logs interleave many event types; only some carry rate_limits.
    // The newest such line reflects current usage — walk from the end.
    const lines = jsonl.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line)
            continue;
        let rec;
        try {
            rec = JSON.parse(line);
        }
        catch {
            continue; // tolerate partial/corrupt lines
        }
        const rl = rec?.payload?.rate_limits;
        if (!rl)
            continue;
        const windows = [];
        for (const w of [rl.primary, rl.secondary]) {
            if (w && typeof w.used_percent === "number") {
                windows.push({ usedPercent: w.used_percent, resetsAt: normalizeResetsAt(w.resets_at) });
            }
        }
        const t = rec.timestamp ? Date.parse(rec.timestamp) / 1000 : 0;
        const freshnessTs = Number.isNaN(t) ? 0 : t;
        return { vendor: "codex", windows, freshnessTs };
    }
    return { vendor: "codex", windows: [], freshnessTs: 0, stale: true };
}
export function isStale(ts, now, ttl) {
    return now - ts > ttl;
}
export function known(v) {
    return !v.stale && v.windows.length > 0;
}
// The binding constraint per vendor is its tightest meter; headroom is what's
// left on that one. Spreading load = keeping the peak fraction of any single
// limit low, so we drive with whichever vendor's tightest meter is emptiest.
export function maxUsed(v) {
    return Math.max(...v.windows.map((w) => w.usedPercent));
}
function tightestReset(v) {
    const tightest = v.windows.find((w) => w.usedPercent === maxUsed(v));
    return tightest?.resetsAt || Infinity;
}
export function chooseDriver(claude, codex) {
    const cKnown = known(claude);
    const xKnown = known(codex);
    if (!cKnown && !xKnown) {
        return { driver: null, reason: "no fresh live usage data for either vendor" };
    }
    if (cKnown !== xKnown) {
        const winner = cKnown ? claude : codex;
        const other = cKnown ? "codex" : "claude";
        const verdict = {
            driver: winner.vendor,
            reason: `${other} usage is stale/unknown; driving with ${winner.vendor} (${Math.round(maxUsed(winner))}% used on its tightest meter)`,
        };
        if (maxUsed(winner) >= HOT_PERCENT) {
            verdict.warn = `${winner.vendor} meter hot (${Math.round(maxUsed(winner))}%) and the other vendor is unknown`;
        }
        return verdict;
    }
    // Both known: more headroom = lower tightest-meter usage. Tie → claude.
    const cUsed = maxUsed(claude);
    const xUsed = maxUsed(codex);
    let driver;
    let reason;
    if (Math.round(cUsed) === Math.round(xUsed)) {
        const cReset = tightestReset(claude);
        const xReset = tightestReset(codex);
        if (xReset < cReset) {
            driver = "codex";
            reason = "tie → codex resets sooner";
        }
        else if (cReset < xReset) {
            driver = "claude";
            reason = "tie → claude resets sooner";
        }
        else {
            driver = "claude";
            reason = "tie on usage and reset → defaulting to claude";
        }
    }
    else {
        driver = xUsed < cUsed ? "codex" : "claude";
        reason = `claude ${Math.round(cUsed)}% vs codex ${Math.round(xUsed)}% on tightest meter → ${driver} has more headroom`;
    }
    const verdict = {
        driver,
        reason,
    };
    if (cUsed >= HOT_PERCENT && xUsed >= HOT_PERCENT) {
        verdict.warn = `both meters hot (claude ${Math.round(cUsed)}%, codex ${Math.round(xUsed)}%) — spreading room is limited`;
    }
    return verdict;
}
