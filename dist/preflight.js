import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export function verifyVendor(vendor, env = process.env, codexAuthPath = join(homedir(), ".codex", "auth.json"), claudeDir = join(homedir(), ".claude")) {
    const cli = vendor;
    try {
        execFileSync("/bin/sh", ["-c", `command -v ${cli}`], { env, stdio: "ignore" });
    }
    catch {
        return { ok: false, reason: `${cli} not found on PATH` };
    }
    const apiKey = vendor === "codex" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    if (env[apiKey] !== undefined) {
        return {
            ok: false,
            reason: `${apiKey} is set — dispatch would bill the API key, not the subscription; unset it`,
        };
    }
    if (vendor === "codex") {
        return existsSync(codexAuthPath)
            ? { ok: true, reason: "" }
            : { ok: false, reason: "not logged in — run codex login" };
    }
    try {
        return statSync(claudeDir).isDirectory()
            ? { ok: true, reason: "" }
            : { ok: false, reason: "not logged in — run claude login" };
    }
    catch {
        return { ok: false, reason: "not logged in — run claude login" };
    }
}
