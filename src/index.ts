import type { Plugin } from "@opencode-ai/plugin"

export { parseRouterOptions } from "./config.js"
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
