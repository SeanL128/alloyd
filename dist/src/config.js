// Static-policy resolution: a role maps to its configured tier, verbatim.
// This is the floor — deterministic, usage-blind. Usage-aware routing (later)
// layers on top by calling substitute() when the preferred vendor is exhausted.
export function resolveRoute(config, role) {
    const tier = config.roles[role];
    if (!tier) {
        const known = Object.keys(config.roles).join(", ") || "(none)";
        throw new Error(`unknown role: ${role}. known roles: ${known}`);
    }
    return { role, vendor: tier.vendor, model: tier.model, effort: tier.effort };
}
// Failover substitution: swap a route to the equal-caliber model on another
// vendor, preserving effort and role. The bands table defines equivalence.
export function substitute(config, route, toVendor) {
    if (route.vendor === toVendor)
        return route;
    const band = config.bands.find((b) => b.models[route.vendor] === route.model);
    if (!band) {
        throw new Error(`model ${route.model} is in no band; cannot substitute across vendors`);
    }
    const peer = band.models[toVendor];
    if (!peer) {
        throw new Error(`band ${band.name} has no ${toVendor} model — unpaired band, cannot substitute`);
    }
    return { ...route, vendor: toVendor, model: peer };
}
export function buildDispatch(config, route, prompt) {
    return config.dispatch[route.vendor]
        .replaceAll("{model}", route.model)
        .replaceAll("{effort}", route.effort)
        .replaceAll("{prompt}", `'${prompt.replaceAll("'", "'\\''")}'`);
}
// Parse + validate. The key invariant: every role's model must appear in some
// band, or cross-vendor failover would dead-end at runtime. Catch it at load.
export function parseConfig(json) {
    const cfg = JSON.parse(json);
    if (!cfg || typeof cfg !== "object")
        throw new Error("config must be an object");
    if (!cfg.roles || typeof cfg.roles !== "object")
        throw new Error("config.roles is missing");
    if (!Array.isArray(cfg.bands))
        throw new Error("config.bands must be an array");
    if (!cfg.dispatch || typeof cfg.dispatch !== "object")
        throw new Error("config.dispatch is missing");
    for (const vendor of ["claude", "codex"]) {
        const template = cfg.dispatch[vendor];
        if (typeof template !== "string" || template.length === 0) {
            throw new Error(`dispatch template for ${vendor} must be a non-empty string`);
        }
        for (const placeholder of ["{model}", "{effort}", "{prompt}"]) {
            if (!template.includes(placeholder)) {
                throw new Error(`dispatch template for ${vendor} is missing ${placeholder}`);
            }
        }
    }
    for (const [role, tier] of Object.entries(cfg.roles)) {
        if (!tier || typeof tier !== "object")
            throw new Error(`role ${role} must be an object`);
        if (tier.vendor !== "claude" && tier.vendor !== "codex") {
            throw new Error(`role ${role} vendor must be claude or codex`);
        }
        if (typeof tier.model !== "string" || tier.model.length === 0) {
            throw new Error(`role ${role} model must be a non-empty string`);
        }
        if (typeof tier.effort !== "string" || tier.effort.length === 0) {
            throw new Error(`role ${role} effort must be a non-empty string`);
        }
    }
    for (let i = 0; i < cfg.bands.length; i++) {
        const band = cfg.bands[i];
        if (!band || typeof band !== "object")
            throw new Error(`band ${i} must be an object`);
        if (typeof band.name !== "string" || band.name.length === 0) {
            throw new Error(`band ${i} name must be a non-empty string`);
        }
        if (!band.models || typeof band.models !== "object") {
            throw new Error(`band ${band.name} models must be an object`);
        }
        let namedVendors = 0;
        for (const vendor of ["claude", "codex"]) {
            if (vendor in band.models) {
                const model = band.models[vendor];
                if (typeof model !== "string" || model.length === 0) {
                    throw new Error(`band ${band.name} model for ${vendor} must be a non-empty string`);
                }
                namedVendors++;
            }
        }
        if (namedVendors === 0) {
            throw new Error(`band ${band.name} must name a model for at least one vendor`);
        }
    }
    for (const [role, tier] of Object.entries(cfg.roles)) {
        if (!cfg.bands.some((band) => band.models[tier.vendor] === tier.model)) {
            throw new Error(`role ${role} model "${tier.model}" is in no band under vendor ${tier.vendor} — failover would dead-end`);
        }
    }
    return cfg;
}
