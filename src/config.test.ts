import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { buildDispatch, parseConfig, resolveRoute, substitute, type RouterConfig } from "./config.ts";

const CFG: RouterConfig = {
  roles: {
    planner: { vendor: "claude", model: "sonnet-5", effort: "medium" },
    builder: { vendor: "codex", model: "gpt-5.6-terra", effort: "medium" },
  },
  bands: [
    { name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } },
    { name: "frontier", models: { claude: "opus-4.8", codex: "gpt-5.6-sol" } },
  ],
  dispatch: {
    claude: "claude -p --model {model} --effort {effort} {prompt}",
    codex: "codex exec --skip-git-repo-check --sandbox workspace-write -m {model} -c model_reasoning_effort={effort} {prompt}",
  },
};

test("resolveRoute returns the role's static tier", () => {
  const r = resolveRoute(CFG, "builder");
  assert.deepEqual(r, { role: "builder", vendor: "codex", model: "gpt-5.6-terra", effort: "medium" });
});

test("resolveRoute throws a clear error naming known roles on an unknown role", () => {
  assert.throws(() => resolveRoute(CFG, "designer"), /unknown role: designer.*planner.*builder/i);
});

test("substitute swaps to the equal-caliber model on the other vendor, preserving effort and role", () => {
  const r = resolveRoute(CFG, "planner"); // claude / sonnet-5
  const s = substitute(CFG, r, "codex");
  assert.deepEqual(s, { role: "planner", vendor: "codex", model: "gpt-5.6-terra", effort: "medium" });
});

test("substitute is a no-op when already on the target vendor", () => {
  const r = resolveRoute(CFG, "planner"); // already claude
  assert.deepEqual(substitute(CFG, r, "claude"), r);
});

test("substitute throws when the model belongs to no band (failover would dead-end)", () => {
  const orphan = { role: "x", vendor: "claude" as const, model: "ghost-9", effort: "low" };
  assert.throws(() => substitute(CFG, orphan, "codex"), /ghost-9.*no band/i);
});

test("substitute throws when the matching band has no model for the target vendor", () => {
  const unpaired: RouterConfig = {
    ...CFG,
    bands: [{ name: "frontier-claude-only", models: { claude: "opus-4.8" } }],
  };
  const route = { role: "reviewer", vendor: "claude" as const, model: "opus-4.8", effort: "high" };

  assert.throws(
    () => substitute(unpaired, route, "codex"),
    /band frontier-claude-only has no codex model.*unpaired band/i,
  );
});

test("buildDispatch produces the exact configured command", () => {
  assert.equal(
    buildDispatch(CFG, resolveRoute(CFG, "builder"), "fix the parser"),
    "codex exec --skip-git-repo-check --sandbox workspace-write -m gpt-5.6-terra -c model_reasoning_effort=medium 'fix the parser'",
  );
});

test("buildDispatch safely shell-quotes embedded single quotes in prompts", () => {
  assert.equal(
    buildDispatch(CFG, resolveRoute(CFG, "planner"), "it's a 'test'"),
    "claude -p --model sonnet-5 --effort medium 'it'\\''s a '\\''test'\\'''",
  );
});

test("parseConfig rejects a config whose role model is absent from every band", () => {
  const bad = JSON.stringify({
    roles: { builder: { vendor: "claude", model: "not-in-any-band", effort: "high" } },
    bands: [{ name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } }],
    dispatch: CFG.dispatch,
  });
  assert.throws(() => parseConfig(bad), /not-in-any-band.*band/i);
});

test("parseConfig rejects a role model that appears only under the other vendor", () => {
  const bad = JSON.stringify({
    roles: { builder: { vendor: "claude", model: "gpt-5.6-terra", effort: "medium" } },
    bands: [{ name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } }],
    dispatch: CFG.dispatch,
  });
  assert.throws(() => parseConfig(bad), /builder.*gpt-5\.6-terra.*vendor claude/i);
});

test("parseConfig rejects a role with a missing required tier field", () => {
  const bad = JSON.stringify({
    roles: { builder: { vendor: "codex", model: "gpt-5.6-terra" } },
    bands: [{ name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } }],
    dispatch: CFG.dispatch,
  });
  assert.throws(() => parseConfig(bad), /role builder.*effort/i);
});

test("parseConfig accepts a one-sided band and a role on its present vendor", () => {
  const raw = JSON.stringify({
    roles: { reviewer: { vendor: "claude", model: "opus-4.8", effort: "high" } },
    bands: [{ name: "frontier-claude-only", models: { claude: "opus-4.8" } }],
    dispatch: CFG.dispatch,
  });

  const cfg = parseConfig(raw);

  assert.deepEqual(cfg.bands[0], {
    name: "frontier-claude-only",
    models: { claude: "opus-4.8" },
  });
  assert.deepEqual(resolveRoute(cfg, "reviewer"), {
    role: "reviewer",
    vendor: "claude",
    model: "opus-4.8",
    effort: "high",
  });
});

test("parseConfig rejects a band with no vendor models", () => {
  const bad = JSON.stringify({
    roles: {},
    bands: [{ name: "empty", models: {} }],
    dispatch: CFG.dispatch,
  });

  assert.throws(
    () => parseConfig(bad),
    /band empty must name a model for at least one vendor/i,
  );
});

test("parseConfig rejects an empty model for a present vendor", () => {
  const bad = JSON.stringify({
    roles: {},
    bands: [{ name: "broken", models: { claude: "", codex: "gpt-5.6-sol" } }],
    dispatch: CFG.dispatch,
  });

  assert.throws(
    () => parseConfig(bad),
    /band broken model for claude must be a non-empty string/i,
  );
});

test("parseConfig rejects a missing dispatch key", () => {
  const bad = JSON.stringify({
    roles: { builder: { vendor: "codex", model: "gpt-5.6-terra", effort: "medium" } },
    bands: [{ name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } }],
  });
  assert.throws(() => parseConfig(bad), /dispatch/i);
});

test("parseConfig rejects a dispatch template missing {prompt}", () => {
  const bad = JSON.stringify({
    roles: { builder: { vendor: "codex", model: "gpt-5.6-terra", effort: "medium" } },
    bands: [{ name: "value", models: { claude: "sonnet-5", codex: "gpt-5.6-terra" } }],
    dispatch: {
      claude: "claude -p --model {model} --effort {effort}",
      codex: "codex exec -m {model} -c model_reasoning_effort={effort} {prompt}",
    },
  });
  assert.throws(() => parseConfig(bad), /claude.*\{prompt\}/i);
});

test("the shipped default config parses and validates", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, "..", "config", "default.json"), "utf8");
  const cfg = parseConfig(raw);
  // every role resolves and every role model can substitute across vendors
  for (const role of Object.keys(cfg.roles)) {
    const r = resolveRoute(cfg, role);
    const other = r.vendor === "claude" ? "codex" : "claude";
    assert.doesNotThrow(() => substitute(cfg, r, other), `role ${role} must be substitutable`);
  }
});
