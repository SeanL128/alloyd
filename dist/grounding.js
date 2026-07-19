import { spawnSync } from "node:child_process";
const MAX_FILES = 150;
const MAX_BYTES = 8192;
// Inject a compact repo file-map so a cold subagent gets exact paths up front
// instead of exploring. Capped so a large repo cannot bloat the prompt (the
// very meter alloyd exists to spread). Returns "" on any failure — a missing
// map must never break a dispatch.
export function buildGroundingPack(cwd, opts = {}) {
    if (process.env.ALLOYD_NO_GROUNDING)
        return "";
    const maxFiles = opts.maxFiles ?? MAX_FILES;
    const maxBytes = opts.maxBytes ?? MAX_BYTES;
    let paths;
    try {
        const result = spawnSync("git", ["-C", cwd, "ls-files"], { encoding: "utf8" });
        if (result.status !== 0 || typeof result.stdout !== "string")
            return "";
        paths = result.stdout.split("\n").filter((line) => line.length > 0);
    }
    catch {
        return "";
    }
    if (paths.length === 0)
        return "";
    const kept = [];
    let bytes = 0;
    for (const path of paths) {
        if (kept.length >= maxFiles)
            break;
        bytes += path.length + 3; // "- " prefix + newline
        if (bytes > maxBytes && kept.length > 0)
            break;
        kept.push(path);
    }
    const dropped = paths.length - kept.length;
    const lines = kept.map((path) => `- ${path}`).join("\n");
    const more = dropped > 0 ? `\n…and ${dropped} more files.` : "";
    return `## Repository map
Files in this repo (for orientation — read only what the task needs):
${lines}${more}`;
}
