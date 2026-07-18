import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestRole } from "./suggest.ts";
import type { RouterConfig } from "./config.ts";

const CFG: RouterConfig = {
  roles: {
    planner: { vendor: "claude", model: "sonnet-5", effort: "medium" },
    builder: { vendor: "codex", model: "gpt-5.6-terra", effort: "medium" },
    reviewer: { vendor: "claude", model: "opus-4.8", effort: "high" },
  },
  bands: [],
  dispatch: {
    claude: "claude -p --model {model} --effort {effort} {prompt}",
    codex: "codex exec -m {model} -c model_reasoning_effort={effort} {prompt}",
  },
};

test("suggests reviewer for review work with high confidence", () => {
  assert.deepEqual(suggestRole(CFG, "review the auth module"), {
    role: "reviewer",
    confidence: "high",
    reason: "matched keyword: review",
  });
});

test("suggests planner for planning work with high confidence", () => {
  assert.deepEqual(suggestRole(CFG, "plan the migration"), {
    role: "planner",
    confidence: "high",
    reason: "matched keyword: plan",
  });
});

test("suggests builder for build work with high confidence", () => {
  assert.deepEqual(suggestRole(CFG, "fix the parser"), {
    role: "builder",
    confidence: "high",
    reason: "matched keyword: fix",
  });
});

test("defaults to builder with low confidence when no keyword matches", () => {
  assert.deepEqual(suggestRole(CFG, "hello"), {
    role: "builder",
    confidence: "low",
    reason: "no planner/reviewer keywords — defaulting to builder",
  });
});

test("skips the reviewer bucket when reviewer is not configured", () => {
  const config = { ...CFG, roles: { planner: CFG.roles.planner, builder: CFG.roles.builder } };

  const suggestion = suggestRole(config, "review X");

  assert.notEqual(suggestion.role, "reviewer");
  assert.deepEqual(suggestion, {
    role: "builder",
    confidence: "low",
    reason: "no planner/reviewer keywords — defaulting to builder",
  });
});

test("falls back to the first configured role when builder is absent", () => {
  const config = { ...CFG, roles: { custom: CFG.roles.builder } };

  assert.deepEqual(suggestRole(config, "hello"), {
    role: "custom",
    confidence: "low",
    reason: "no planner/reviewer keywords — defaulting to builder",
  });
});
