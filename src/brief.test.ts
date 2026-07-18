import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBrief, renderBrief } from "./brief.ts";

const BRIEF = {
  goal: "Add task briefs",
  files: ["src/brief.ts", "src/brief.test.ts"],
  constraints: "Zero dependencies",
  acceptance: "Tests pass",
};

test("parseBrief accepts a valid brief", () => {
  assert.deepEqual(parseBrief(BRIEF), BRIEF);
});

test("parseBrief reports all missing or empty fields in one error", () => {
  assert.throws(
    () => parseBrief({ goal: "", files: [], constraints: "", acceptance: "" }),
    /goal.*constraints.*acceptance/i,
  );
});

test("parseBrief reports all four fields for an empty object", () => {
  assert.throws(() => parseBrief({}), /goal.*files.*constraints.*acceptance/i);
});

test("parseBrief rejects files that are not an array of strings", () => {
  assert.throws(() => parseBrief({ ...BRIEF, files: "src/brief.ts" }), /files/i);
  assert.throws(() => parseBrief({ ...BRIEF, files: ["src/brief.ts", 3] }), /files/i);
});

test("parseBrief accepts an empty files array", () => {
  assert.deepEqual(parseBrief({ ...BRIEF, files: [] }), { ...BRIEF, files: [] });
});

test("renderBrief uses the exact dispatch-prompt shape", () => {
  assert.equal(
    renderBrief(BRIEF),
    "## Goal\nAdd task briefs\n\n## Files\n- src/brief.ts\n- src/brief.test.ts\n\n## Constraints\nZero dependencies\n\n## Acceptance criteria\nTests pass",
  );
});
