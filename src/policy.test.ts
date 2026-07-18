import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRoute, type Route, type RouterConfig } from "./config.ts";
import { selectRoute } from "./policy.ts";
import type { Vendor, VendorUsage } from "./usage.ts";

const CFG: RouterConfig = {
  roles: {
    planner: { vendor: "claude", model: "sonnet-5", effort: "medium" },
    builder: { vendor: "codex", model: "gpt-5.6-terra", effort: "medium" },
  },
  bands: [
    { name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } },
  ],
  dispatch: {
    claude: "claude -p --model {model} --effort {effort} {prompt}",
    codex: "codex exec -m {model} -c model_reasoning_effort={effort} {prompt}",
  },
};

function usage(vendor: Vendor, usedPercent?: number, stale = false): VendorUsage {
  return {
    vendor,
    windows: usedPercent === undefined ? [] : [{ usedPercent, resetsAt: 0 }],
    freshnessTs: 1,
    stale,
  };
}

const staticBuilder = resolveRoute(CFG, "builder");
const staticCases: Array<{
  name: string;
  claude: VendorUsage;
  codex: VendorUsage;
  reason: string;
  warn?: RegExp;
}> = [
  {
    name: "uses static policy when the preferred vendor is stale",
    claude: usage("claude", 10),
    codex: usage("codex", 90, true),
    reason: "usage unknown → static policy",
  },
  {
    name: "is byte-identical to static policy when both usages are unknown",
    claude: usage("claude"),
    codex: usage("codex"),
    reason: "usage unknown → static policy",
  },
  {
    name: "uses static policy when a hot preferred vendor has no known alternative",
    claude: usage("claude"),
    codex: usage("codex", 91),
    reason: "preferred vendor has headroom",
  },
  {
    name: "stays on the configured vendor when both vendors are hot",
    claude: usage("claude", 95.4),
    codex: usage("codex", 90.4),
    reason: "both hot — staying on configured vendor",
    warn: /both meters hot.*codex 90%.*claude 95%/i,
  },
  {
    name: "stays on the configured vendor when both are exactly 80 percent",
    claude: usage("claude", 80),
    codex: usage("codex", 80),
    reason: "both hot — staying on configured vendor",
    warn: /both meters hot.*codex 80%.*claude 80%/i,
  },
  {
    name: "uses static policy while the preferred vendor has headroom",
    claude: usage("claude", 10),
    codex: usage("codex", 79.9),
    reason: "preferred vendor has headroom",
  },
];

for (const { name, claude, codex, reason, warn } of staticCases) {
  test(name, () => {
    const selection = selectRoute(CFG, "builder", { claude, codex });

    assert.deepEqual(selection.route, staticBuilder);
    assert.equal(selection.substituted, false);
    assert.equal(selection.reason, reason);
    if (warn) assert.match(selection.warn ?? "", warn);
    else assert.equal(selection.warn, undefined);
  });
}

test("substitutes at the 80 percent boundary when the other vendor is strictly cooler", () => {
  const selection = selectRoute(CFG, "builder", {
    claude: usage("claude", 40.4),
    codex: usage("codex", 80),
  });

  assert.deepEqual(selection.route, {
    role: "builder",
    vendor: "claude",
    model: "sonnet-5",
    effort: "medium",
  } satisfies Route);
  assert.equal(selection.substituted, true);
  assert.match(selection.reason, /codex 80% vs claude 40% → substituting to claude/);
  assert.equal(selection.warn, undefined);
});

test("uses raw percentages for the strictly-lower comparison before rounding the reason", () => {
  const selection = selectRoute(CFG, "builder", {
    claude: usage("claude", 80.3),
    codex: usage("codex", 80.4),
  });

  assert.equal(selection.route.vendor, "claude");
  assert.equal(selection.substituted, true);
  assert.match(selection.reason, /codex 80% vs claude 80% → substituting to claude/);
  assert.equal(selection.warn, undefined);
});

test("stays with a warning when the cooler vendor has no equal-band peer", () => {
  const unpaired: RouterConfig = {
    ...CFG,
    roles: {
      ...CFG.roles,
      reviewer: { vendor: "claude" as const, model: "opus-4.8", effort: "high" },
    },
    bands: [{ name: "frontier-claude-only", models: { claude: "opus-4.8" } }],
  };

  const selection = selectRoute(unpaired, "reviewer", {
    claude: usage("claude", 90.4),
    codex: usage("codex", 20.2),
  });

  assert.deepEqual(selection.route, {
    role: "reviewer",
    vendor: "claude",
    model: "opus-4.8",
    effort: "high",
  } satisfies Route);
  assert.equal(selection.substituted, false);
  assert.match(selection.reason, /claude hot but opus-4\.8 has no codex peer.*staying/i);
  assert.match(selection.warn ?? "", /claude 90%.*no equal-band peer on codex.*unpaired band/i);
});

test("throws through resolveRoute for an unknown role", () => {
  assert.throws(
    () => selectRoute(CFG, "designer", {
      claude: usage("claude"),
      codex: usage("codex"),
    }),
    /unknown role: designer.*planner.*builder/i,
  );
});
