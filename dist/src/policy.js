import { resolveRoute, substitute } from "./config.js";
import { known, maxUsed } from "./usage.js";
// ASSUMPTION: Keep the pinned threshold local because usage.ts may only export known/maxUsed.
const HOT_PERCENT = 80;
export function selectRoute(config, role, usage) {
    const route = resolveRoute(config, role);
    const preferred = usage[route.vendor];
    if (!known(preferred)) {
        return { route, reason: "usage unknown → static policy", substituted: false };
    }
    const otherVendor = route.vendor === "claude" ? "codex" : "claude";
    const other = usage[otherVendor];
    const preferredUsed = maxUsed(preferred);
    if (preferredUsed >= HOT_PERCENT && known(other)) {
        const otherUsed = maxUsed(other);
        if (otherUsed < preferredUsed) {
            try {
                return {
                    route: substitute(config, route, otherVendor),
                    reason: `${route.vendor} ${Math.round(preferredUsed)}% vs ${otherVendor} ${Math.round(otherUsed)}% → substituting to ${otherVendor}`,
                    substituted: true,
                };
            }
            catch {
                return {
                    route,
                    reason: `${route.vendor} hot but ${route.model} has no ${otherVendor} peer — staying`,
                    warn: `${route.vendor} ${Math.round(preferredUsed)}% and no equal-band peer on ${otherVendor} (unpaired band)`,
                    substituted: false,
                };
            }
        }
        if (otherUsed >= HOT_PERCENT) {
            return {
                route,
                reason: "both hot — staying on configured vendor",
                warn: `both meters hot (${route.vendor} ${Math.round(preferredUsed)}%, ${otherVendor} ${Math.round(otherUsed)}%) — staying on configured vendor`,
                substituted: false,
            };
        }
    }
    return { route, reason: "preferred vendor has headroom", substituted: false };
}
