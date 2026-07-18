import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroundingPack } from "./grounding.ts";

function gitRepo(files: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "alloyd-ground-"));
  spawnSync("git", ["-C", dir, "init", "-q"], { encoding: "utf8" });
  for (const name of files) writeFileSync(join(dir, name), "x");
  spawnSync("git", ["-C", dir, "add", "."], { encoding: "utf8" });
  return dir;
}

test("buildGroundingPack lists tracked files under a Repository map heading", () => {
  const dir = gitRepo(["a.ts", "b.ts"]);
  try {
    const pack = buildGroundingPack(dir);
    assert.match(pack, /## Repository map/);
    assert.match(pack, /- a\.ts/);
    assert.match(pack, /- b\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildGroundingPack returns empty string outside a git repo", () => {
  const dir = mkdtempSync(join(tmpdir(), "alloyd-nogit-"));
  try {
    assert.equal(buildGroundingPack(dir), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildGroundingPack honors the ALLOYD_NO_GROUNDING off-switch", () => {
  const dir = gitRepo(["a.ts"]);
  process.env.ALLOYD_NO_GROUNDING = "1";
  try {
    assert.equal(buildGroundingPack(dir), "");
  } finally {
    delete process.env.ALLOYD_NO_GROUNDING;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildGroundingPack caps the list and marks how many were dropped", () => {
  const dir = gitRepo(["a.ts", "b.ts", "c.ts"]);
  try {
    const pack = buildGroundingPack(dir, { maxFiles: 2 });
    assert.match(pack, /…and 1 more files\./);
    assert.equal((pack.match(/\n- /g) ?? []).length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
