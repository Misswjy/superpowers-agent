import type { RouterAgents } from "./agents.js"

export type MergeResult = {
  added: string[]
  skipped: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function mergeRouterAgents(config: Record<string, unknown>, agents: RouterAgents): MergeResult {
  if (!isRecord(config.agent)) {
    config.agent = {}
  }

  const agentConfig = config.agent as Record<string, unknown>
  const added: string[] = []
  const skipped: string[] = []

  for (const [name, agent] of Object.entries(agents)) {
    if (Object.prototype.hasOwnProperty.call(agentConfig, name)) {
      skipped.push(name)
      continue
    }

    agentConfig[name] = agent
    added.push(name)
  }

  return { added, skipped }
}
