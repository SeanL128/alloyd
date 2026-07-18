import type { RouterConfig } from "./config.ts";

export type Suggestion = { role: string; confidence: "high" | "low"; reason: string };

// Keyword heuristic; swap for a model-backed classifier only if real usage shows misroutes.
export function suggestRole(config: RouterConfig, taskText: string): Suggestion {
  const roles = Object.keys(config.roles);
  if (roles.length === 0) throw new Error("no roles configured");

  const text = taskText.toLowerCase();
  const buckets: Array<{ role: string; keywords: string[] }> = [
    { role: "reviewer", keywords: ["review", "audit", "critique", "verify", "check over", "code review"] },
    { role: "planner", keywords: ["plan", "design", "spec", "architect", "roadmap", "break down"] },
    { role: "builder", keywords: ["build", "implement", "fix", "refactor", "write", "add"] },
  ];

  for (const bucket of buckets) {
    if (!config.roles[bucket.role]) continue;
    const matched = bucket.keywords.find((keyword) => text.includes(keyword));
    if (matched) return { role: bucket.role, confidence: "high", reason: `matched keyword: ${matched}` };
  }

  return {
    role: config.roles.builder ? "builder" : roles[0],
    confidence: "low",
    reason: "no planner/reviewer keywords — defaulting to builder",
  };
}
