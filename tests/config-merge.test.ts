import { describe, expect, it } from "vitest"
import { buildRouterAgents } from "../src/agents.js"
import { mergeRouterAgents } from "../src/config-merge.js"

const routerConfig = {
  tiers: {
    fast: "packycode/fast-model",
    standard: "packycode/standard-model",
    reasoning: "packycode/reasoning-model",
  },
  permissions: {
    fastBash: "deny" as const,
    reviewerBash: "ask" as const,
  },
  logLevel: "info" as const,
}

describe("mergeRouterAgents", () => {
  it("creates config.agent when missing", () => {
    const config: Record<string, unknown> = {}
    const result = mergeRouterAgents(config, buildRouterAgents(routerConfig))

    expect(result.added).toHaveLength(4)
    expect(result.skipped).toHaveLength(0)
    expect((config.agent as Record<string, unknown>)["superpowers-router-standard-worker"]).toBeDefined()
  })

  it("preserves existing unrelated agents", () => {
    const config: Record<string, unknown> = {
      agent: {
        custom: {
          description: "User agent",
          mode: "subagent",
        },
      },
    }

    const result = mergeRouterAgents(config, buildRouterAgents(routerConfig))

    expect(result.added).toHaveLength(4)
    expect((config.agent as Record<string, unknown>).custom).toEqual({
      description: "User agent",
      mode: "subagent",
    })
  })

  it("skips generated agents that conflict with user config", () => {
    const config: Record<string, unknown> = {
      agent: {
        "superpowers-router-reviewer": {
          description: "User-owned reviewer",
        },
      },
    }

    const result = mergeRouterAgents(config, buildRouterAgents(routerConfig))

    expect(result.added).toHaveLength(3)
    expect(result.skipped).toEqual(["superpowers-router-reviewer"])
    expect((config.agent as Record<string, unknown>)["superpowers-router-reviewer"]).toEqual({
      description: "User-owned reviewer",
    })
  })
})
