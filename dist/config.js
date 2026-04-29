const MODEL_ID_PATTERN = /^[^/\s]+\/[^/\s]+$/;
const BASH_PERMISSIONS = new Set(["deny", "ask"]);
const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
    const value = record[key];
    return typeof value === "string" ? value : undefined;
}
function invalid(reason) {
    return { enabled: false, reason };
}
function validateModelId(field, value) {
    if (!value)
        return invalid(`Missing required model tier: ${field}`);
    if (!MODEL_ID_PATTERN.test(value)) {
        return invalid(`Invalid model tier ${field}: expected provider/model`);
    }
    return value;
}
function validateBashPermission(field, value, fallback) {
    if (value === undefined)
        return fallback;
    if (typeof value === "string" && BASH_PERMISSIONS.has(value)) {
        return value;
    }
    return invalid(`Invalid ${field}: expected deny or ask`);
}
function validateLogLevel(value) {
    if (value === undefined)
        return "info";
    if (typeof value === "string" && LOG_LEVELS.has(value)) {
        return value;
    }
    return invalid("Invalid logLevel: expected debug, info, warn, or error");
}
export function parseRouterOptions(options) {
    if (!isRecord(options)) {
        return invalid("Plugin options must be an object with tiers.fast, tiers.standard, and tiers.reasoning");
    }
    const tiersInput = options.tiers;
    if (!isRecord(tiersInput)) {
        return invalid("Missing required tiers object");
    }
    const fast = validateModelId("tiers.fast", readString(tiersInput, "fast"));
    if (typeof fast !== "string")
        return fast;
    const standard = validateModelId("tiers.standard", readString(tiersInput, "standard"));
    if (typeof standard !== "string")
        return standard;
    const reasoning = validateModelId("tiers.reasoning", readString(tiersInput, "reasoning"));
    if (typeof reasoning !== "string")
        return reasoning;
    const permissionsInput = isRecord(options.permissions) ? options.permissions : {};
    const fastBash = validateBashPermission("permissions.fastBash", permissionsInput.fastBash, "deny");
    if (typeof fastBash !== "string")
        return fastBash;
    const reviewerBash = validateBashPermission("permissions.reviewerBash", permissionsInput.reviewerBash, "ask");
    if (typeof reviewerBash !== "string")
        return reviewerBash;
    const logLevel = validateLogLevel(options.logLevel);
    if (typeof logLevel !== "string")
        return logLevel;
    const config = {
        tiers: { fast, standard, reasoning },
        permissions: { fastBash, reviewerBash },
        logLevel,
    };
    return { enabled: true, config };
}
