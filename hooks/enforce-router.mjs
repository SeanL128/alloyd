#!/usr/bin/env node

try {
  const input = JSON.parse(await new Response(process.stdin).text());
  const raw = ["Bash", "shell", "local_shell"].includes(input?.tool_name) ? input.tool_input?.command : undefined;
  const command = Array.isArray(raw) ? raw.join(" ") : raw;

  // Match only actual invocations (start of a command segment, after optional
  // env-var assignments) — not mentions of the CLIs in grep patterns, file
  // content, or heredocs quoted mid-line. Segment starts: line start, ; & |,
  // $( or backtick substitution.
  // ponytail: misses wrapper invocations like `xargs codex exec`; tighten if seen
  const INVOKE =
    /(?:^|[;&|]|\$\(|`|\n)\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:codex\s+exec\b|claude\s+(?:-p|--print)\b)/;

  if (
    typeof command === "string" &&
    !process.env.ALLOYD_DISPATCH &&
    INVOKE.test(command)
  ) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Route this through the alloyd `dispatch` MCP tool instead of calling codex exec or claude -p directly.",
      },
    }));
  }
} catch {
  // Fail open: a broken enforcement hook must never block Bash.
}
