import { describe, expect, it } from "vitest"
import { SuperpowersAgentRouter } from "../src/index.js"

describe("SuperpowersAgentRouter", () => {
  it("exports an OpenCode plugin factory", () => {
    expect(typeof SuperpowersAgentRouter).toBe("function")
  })
})
