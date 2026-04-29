import type { Plugin } from "@opencode-ai/plugin"

export { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js"
export type { RouterAgentConfig, RouterAgentName, RouterAgents } from "./agents.js"
export { mergeRouterAgents } from "./config-merge.js"
export type { MergeResult } from "./config-merge.js"
export { parseRouterOptions } from "./config.js"
export { buildSystemInstruction } from "./instructions.js"
export { routeTask } from "./routing-policy.js"
export type { RoutingDecision, RoutingInput } from "./routing-policy.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
