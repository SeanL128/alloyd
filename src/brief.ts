export type Brief = {
  goal: string;
  files: string[];
  constraints: string;
  acceptance: string;
};

export function parseBrief(input: unknown): Brief {
  const brief = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const invalid: string[] = [];

  if (typeof brief.goal !== "string" || brief.goal.length === 0) invalid.push("goal");
  if (!Array.isArray(brief.files) || !brief.files.every((file) => typeof file === "string")) {
    invalid.push("files");
  }
  for (const field of ["constraints", "acceptance"] as const) {
    if (typeof brief[field] !== "string" || brief[field].length === 0) invalid.push(field);
  }

  if (invalid.length > 0) {
    throw new Error(`missing or invalid brief fields: ${invalid.join(", ")}`);
  }

  return brief as Brief;
}

export function renderBrief(brief: Brief): string {
  return `## Goal
${brief.goal}

## Files
${brief.files.map((file) => `- ${file}`).join("\n")}

## Constraints
${brief.constraints}

## Acceptance criteria
${brief.acceptance}`;
}
