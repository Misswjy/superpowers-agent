import type { ModelTier } from "./types.js";
export type RoutingInput = {
    role?: string;
    description?: string;
    prompt?: string;
    phase?: string;
};
export type RoutingDecision = {
    tier: ModelTier;
    reason: string;
};
export declare function routeTask(input: RoutingInput): RoutingDecision;
