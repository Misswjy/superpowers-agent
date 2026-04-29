import type { RouterConfig } from "./types.js";
export declare const ROUTER_AGENT_NAMES: readonly ["superpowers-router-fast-explorer", "superpowers-router-standard-worker", "superpowers-router-reasoning-worker", "superpowers-router-reviewer"];
export type RouterAgentName = (typeof ROUTER_AGENT_NAMES)[number];
export type RouterAgentConfig = {
    description: string;
    mode: "subagent";
    hidden: true;
    model: string;
    permission?: Record<string, unknown>;
};
export type RouterAgents = Record<RouterAgentName, RouterAgentConfig>;
export declare function buildRouterAgents(config: RouterConfig): RouterAgents;
