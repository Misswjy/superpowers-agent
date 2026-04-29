import type { RouterConfig } from "./types.js"

export const ROUTER_AGENT_NAMES = [
  "superpowers-router-fast-explorer",
  "superpowers-router-standard-worker",
  "superpowers-router-reasoning-worker",
  "superpowers-router-reviewer",
] as const

export type RouterAgentName = (typeof ROUTER_AGENT_NAMES)[number]

export type RouterAgentConfig = {
  description: string
  mode: "subagent"
  hidden: true
  model: string
  permission?: Record<string, unknown>
}

export type RouterAgents = Record<RouterAgentName, RouterAgentConfig>

export function buildRouterAgents(config: RouterConfig): RouterAgents {
  return {
    "superpowers-router-fast-explorer": {
      description:
        "Use for Superpowers code exploration tasks that search, inspect, read, map, or summarize code without editing.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.fast,
      permission: {
        read: "allow",
        list: "allow",
        grep: "allow",
        glob: "allow",
        edit: "deny",
        write: "deny",
        bash: config.permissions.fastBash,
      },
    },
    "superpowers-router-standard-worker": {
      description:
        "Use for ordinary Superpowers implementation tasks with clear scope, local fixes, tests, docs, and well-specified changes.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.standard,
    },
    "superpowers-router-reasoning-worker": {
      description:
        "Use for complex Superpowers tasks requiring architecture, algorithms, math, root-cause debugging, security, data model, concurrency, or cross-module reasoning.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.reasoning,
    },
    "superpowers-router-reviewer": {
      description:
        "Use for Superpowers review tasks including spec compliance review, code quality review, final review, and high-judgment validation.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.reasoning,
      permission: {
        read: "allow",
        list: "allow",
        grep: "allow",
        glob: "allow",
        edit: "deny",
        write: "deny",
        bash: config.permissions.reviewerBash,
      },
    },
  }
}
