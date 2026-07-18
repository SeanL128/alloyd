import { execFileSync } from "node:child_process";
import type { Vendor } from "./usage.ts";

const PROBES: Record<Vendor, [string, string[]]> = {
  claude: ["claude", ["-p", "--model", "claude-haiku-4-5-20251001", "reply with only: ok"]],
  codex: ["codex", ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.6-luna", "reply with only: ok"]],
};

export function probeVendor(
  vendor: Vendor,
  exec: (cmd: string, args: string[]) => void = (cmd, args) => {
    execFileSync(cmd, args, { timeout: 120_000, stdio: "ignore" });
  },
): boolean {
  try {
    const [cmd, args] = PROBES[vendor];
    exec(cmd, args);
    return true;
  } catch {
    return false;
  }
}
