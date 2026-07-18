export function parseBrief(input) {
    const brief = input && typeof input === "object" && !Array.isArray(input)
        ? input
        : {};
    const invalid = [];
    if (typeof brief.goal !== "string" || brief.goal.length === 0)
        invalid.push("goal");
    if (!Array.isArray(brief.files) || !brief.files.every((file) => typeof file === "string")) {
        invalid.push("files");
    }
    for (const field of ["constraints", "acceptance"]) {
        if (typeof brief[field] !== "string" || brief[field].length === 0)
            invalid.push(field);
    }
    if (invalid.length > 0) {
        throw new Error(`missing or invalid brief fields: ${invalid.join(", ")}`);
    }
    return brief;
}
export function renderBrief(brief) {
    return `## Goal
${brief.goal}

## Files
${brief.files.map((file) => `- ${file}`).join("\n")}

## Constraints
${brief.constraints}

## Acceptance criteria
${brief.acceptance}`;
}
