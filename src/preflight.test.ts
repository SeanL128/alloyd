import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyVendor } from "./preflight.ts";

function testPaths() {
  const dir = mkdtempSync(join(tmpdir(), "alloyd-preflight-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  for (const cli of ["codex", "claude"]) {
    const path = join(bin, cli);
    writeFileSync(path, "#!/bin/sh\nexit 0\n");
    chmodSync(path, 0o755);
  }
  return {
    dir,
    env: { PATH: bin },
    codexAuthPath: join(dir, "auth.json"),
    claudeDir: join(dir, "claude"),
  };
}

test("verifyVendor refuses a missing codex CLI", () => {
  const paths = testPaths();
  try {
    assert.deepEqual(
      verifyVendor("codex", { PATH: "" }, paths.codexAuthPath, paths.claudeDir),
      { ok: false, reason: "codex not found on PATH" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});

test("verifyVendor refuses a missing claude CLI", () => {
  const paths = testPaths();
  try {
    assert.deepEqual(
      verifyVendor("claude", { PATH: "" }, paths.codexAuthPath, paths.claudeDir),
      { ok: false, reason: "claude not found on PATH" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});

test("verifyVendor refuses codex API-key authentication", () => {
  const paths = testPaths();
  try {
    assert.deepEqual(
      verifyVendor("codex", { ...paths.env, OPENAI_API_KEY: "sk-test" }, paths.codexAuthPath, paths.claudeDir),
      { ok: false, reason: "OPENAI_API_KEY is set — dispatch would bill the API key, not the subscription; unset it" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});

test("verifyVendor refuses claude API-key authentication", () => {
  const paths = testPaths();
  try {
    assert.deepEqual(
      verifyVendor("claude", { ...paths.env, ANTHROPIC_API_KEY: "sk-test" }, paths.codexAuthPath, paths.claudeDir),
      { ok: false, reason: "ANTHROPIC_API_KEY is set — dispatch would bill the API key, not the subscription; unset it" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});

test("verifyVendor tells codex users to log in when auth is absent", () => {
  const paths = testPaths();
  try {
    assert.equal(existsSync(paths.codexAuthPath), false);
    assert.deepEqual(
      verifyVendor("codex", paths.env, paths.codexAuthPath, paths.claudeDir),
      { ok: false, reason: "not logged in — run codex login" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});

test("verifyVendor tells claude users to log in when its directory is absent", () => {
  const paths = testPaths();
  try {
    assert.equal(existsSync(paths.claudeDir), false);
    assert.deepEqual(
      verifyVendor("claude", paths.env, paths.codexAuthPath, paths.claudeDir),
      { ok: false, reason: "not logged in — run claude login" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});

test("verifyVendor accepts subscription evidence after CLI and API-key checks", () => {
  const paths = testPaths();
  try {
    writeFileSync(paths.codexAuthPath, "{}");
    mkdirSync(paths.claudeDir);
    assert.deepEqual(
      verifyVendor("codex", paths.env, paths.codexAuthPath, paths.claudeDir),
      { ok: true, reason: "" },
    );
    assert.deepEqual(
      verifyVendor("claude", paths.env, paths.codexAuthPath, paths.claudeDir),
      { ok: true, reason: "" },
    );
  } finally {
    rmSync(paths.dir, { recursive: true, force: true });
  }
});
