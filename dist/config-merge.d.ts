import type { RouterAgents } from "./agents.js";
export type MergeResult = {
    added: string[];
    skipped: string[];
};
export declare function mergeRouterAgents(config: Record<string, unknown>, agents: RouterAgents): MergeResult;
