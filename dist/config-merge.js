function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function mergeRouterAgents(config, agents) {
    if (!isRecord(config.agent)) {
        config.agent = {};
    }
    const agentConfig = config.agent;
    const added = [];
    const skipped = [];
    for (const [name, agent] of Object.entries(agents)) {
        if (Object.prototype.hasOwnProperty.call(agentConfig, name)) {
            skipped.push(name);
            continue;
        }
        agentConfig[name] = agent;
        added.push(name);
    }
    return { added, skipped };
}
