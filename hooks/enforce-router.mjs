#!/usr/bin/env node

try {
  const input = JSON.parse(await new Response(process.stdin).text());
  const raw = ["Bash", "shell", "local_shell"].includes(input?.tool_name) ? input.tool_input?.command : undefined;
  const command = Array.isArray(raw) ? raw.join(" ") : raw;

  if (
    typeof command === "string" &&
    !process.env.ALLOYD_DISPATCH &&
    (/\bcodex\s+exec\b/.test(command) || /\bclaude\s+(?:-p|--print)\b/.test(command))
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
