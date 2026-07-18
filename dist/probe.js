import { execFileSync } from "node:child_process";
const PROBES = {
    claude: ["claude", ["-p", "--model", "claude-haiku-4-5-20251001", "reply with only: ok"]],
    codex: ["codex", ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.6-luna", "reply with only: ok"]],
};
export function probeVendor(vendor, exec = (cmd, args) => {
    execFileSync(cmd, args, { timeout: 120_000, stdio: "ignore" });
}) {
    try {
        const [cmd, args] = PROBES[vendor];
        exec(cmd, args);
        return true;
    }
    catch {
        return false;
    }
}
