import { describe, expect, it } from "vitest"
import { buildRouterAgents } from "../src/agents.js"

const config = {
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

describe("buildRouterAgents", () => {
  it("creates four hidden subagents with tier models", () => {
    const agents = buildRouterAgents(config)

    expect(Object.keys(agents)).toEqual([
      "superpowers-router-fast-explorer",
      "superpowers-router-standard-worker",
      "superpowers-router-reasoning-worker",
      "superpowers-router-reviewer",
    ])
    expect(agents["superpowers-router-fast-explorer"]?.model).toBe("packycode/fast-model")
    expect(agents["superpowers-router-standard-worker"]?.model).toBe("packycode/standard-model")
    expect(agents["superpowers-router-reasoning-worker"]?.model).toBe("packycode/reasoning-model")
    expect(agents["superpowers-router-reviewer"]?.model).toBe("packycode/reasoning-model")
    expect(agents["superpowers-router-fast-explorer"]?.hidden).toBe(true)
    expect(agents["superpowers-router-fast-explorer"]?.mode).toBe("subagent")
  })

  it("uses read-only permissions for explorer and reviewer", () => {
    const agents = buildRouterAgents(config)

    expect(agents["superpowers-router-fast-explorer"]?.permission).toMatchObject({
      read: "allow",
      list: "allow",
      grep: "allow",
      glob: "allow",
      edit: "deny",
      write: "deny",
      bash: "deny",
    })
    expect(agents["superpowers-router-reviewer"]?.permission).toMatchObject({
      edit: "deny",
      write: "deny",
      bash: "ask",
    })
  })

  it("writes clear descriptions for Task selection", () => {
    const agents = buildRouterAgents(config)

    expect(agents["superpowers-router-fast-explorer"]?.description).toContain("Superpowers code exploration")
    expect(agents["superpowers-router-standard-worker"]?.description).toContain("ordinary Superpowers implementation")
    expect(agents["superpowers-router-reasoning-worker"]?.description).toContain("complex Superpowers")
    expect(agents["superpowers-router-reviewer"]?.description).toContain("Superpowers review")
  })
})
