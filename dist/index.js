import { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js";
import { mergeRouterAgents } from "./config-merge.js";
import { parseRouterOptions } from "./config.js";
import { buildSystemInstruction } from "./instructions.js";
import { createLogger } from "./logger.js";
export { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js";
export { mergeRouterAgents } from "./config-merge.js";
export { parseRouterOptions } from "./config.js";
export { buildSystemInstruction } from "./instructions.js";
export { createLogger } from "./logger.js";
export { routeTask } from "./routing-policy.js";
export const SuperpowersAgentRouter = async (input, options) => {
    const parsed = parseRouterOptions(options);
    const logLevel = parsed.enabled ? parsed.config.logLevel : "info";
    const logger = createLogger(input, logLevel);
    if (!parsed.enabled) {
        await logger.error("Superpowers agent routing disabled", { reason: parsed.reason });
        return {
            config: async () => { },
            "experimental.chat.system.transform": async () => { },
        };
    }
    const routerAgents = buildRouterAgents(parsed.config);
    const systemInstruction = buildSystemInstruction();
    await logger.info("Superpowers agent routing enabled", {
        agents: ROUTER_AGENT_NAMES,
        tiers: parsed.config.tiers,
    });
    return {
        config: async (config) => {
            const result = mergeRouterAgents(config, routerAgents);
            if (result.skipped.length > 0) {
                await logger.warn("Skipped router agents because user config already defines them", {
                    skipped: result.skipped,
                });
            }
            await logger.debug("Merged router agents into OpenCode config", {
                added: result.added,
                skipped: result.skipped,
            });
        },
        "experimental.chat.system.transform": async (_input, output) => {
            output.system.push(systemInstruction);
        },
    };
};
export default SuperpowersAgentRouter;
