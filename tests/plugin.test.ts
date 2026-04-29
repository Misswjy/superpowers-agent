import { describe, expect, it } from "vitest"
import { SuperpowersAgentRouter } from "../src/index.js"

function createPluginInput() {
  const logs: Array<Record<string, unknown>> = []

  return {
    logs,
    input: {
      project: {} as never,
      directory: "/repo",
      worktree: "/repo",
      serverUrl: new URL("http://localhost:4096"),
      $: {} as never,
      client: {
        app: {
          log: async (entry: Record<string, unknown>) => {
            logs.push(entry)
          },
        },
      } as never,
    },
  }
}

describe("SuperpowersAgentRouter plugin", () => {
  it("injects router agents and system instruction for valid options", async () => {
    const { input, logs } = createPluginInput()
    const hooks = await SuperpowersAgentRouter(input, {
      tiers: {
        fast: "packycode/fast-model",
        standard: "packycode/standard-model",
        reasoning: "packycode/reasoning-model",
      },
    })

    const config: Record<string, unknown> = {}
    await hooks.config?.(config as never)

    expect((config.agent as Record<string, unknown>)["superpowers-router-fast-explorer"]).toBeDefined()

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.(
      {
        sessionID: "session-1",
        model: {} as never,
      },
      output,
    )

    expect(output.system).toHaveLength(1)
    expect(output.system[0]).toContain("superpowers-router-standard-worker")
    expect(logs.length).toBeGreaterThan(0)
  })

  it("does not inject agents or system instruction for invalid options", async () => {
    const { input, logs } = createPluginInput()
    const hooks = await SuperpowersAgentRouter(input, {
      tiers: {
        fast: "bad-model",
        standard: "packycode/standard-model",
        reasoning: "packycode/reasoning-model",
      },
    })

    const config: Record<string, unknown> = {}
    await hooks.config?.(config as never)

    expect(config.agent).toBeUndefined()

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.(
      {
        sessionID: "session-1",
        model: {} as never,
      },
      output,
    )

    expect(output.system).toEqual([])
    expect(logs.length).toBeGreaterThan(0)
  })
})
