import { describe, expect, it } from "vitest"
import { parseRouterOptions } from "../src/config.js"

describe("parseRouterOptions", () => {
  it("accepts three explicit model tiers", () => {
    const result = parseRouterOptions({
      tiers: {
        fast: "packycode/fast-model",
        standard: "packycode/standard-model",
        reasoning: "packycode/reasoning-model",
      },
      permissions: {
        fastBash: "ask",
        reviewerBash: "deny",
      },
      logLevel: "debug",
    })

    expect(result.enabled).toBe(true)
    if (!result.enabled) throw new Error("expected enabled config")
    expect(result.config.tiers.fast).toBe("packycode/fast-model")
    expect(result.config.permissions.fastBash).toBe("ask")
    expect(result.config.permissions.reviewerBash).toBe("deny")
    expect(result.config.logLevel).toBe("debug")
  })

  it("defaults optional permissions and log level", () => {
    const result = parseRouterOptions({
      tiers: {
        fast: "packycode/fast-model",
        standard: "packycode/standard-model",
        reasoning: "packycode/reasoning-model",
      },
    })

    expect(result.enabled).toBe(true)
    if (!result.enabled) throw new Error("expected enabled config")
    expect(result.config.permissions.fastBash).toBe("deny")
    expect(result.config.permissions.reviewerBash).toBe("ask")
    expect(result.config.logLevel).toBe("info")
  })

  it("disables routing when a tier is missing", () => {
    const result = parseRouterOptions({
      tiers: {
        fast: "packycode/fast-model",
        standard: "packycode/standard-model",
      },
    })

    expect(result.enabled).toBe(false)
    if (result.enabled) throw new Error("expected disabled config")
    expect(result.reason).toContain("tiers.reasoning")
  })

  it("disables routing when a model id is not provider/model", () => {
    const result = parseRouterOptions({
      tiers: {
        fast: "fast-model",
        standard: "packycode/standard-model",
        reasoning: "packycode/reasoning-model",
      },
    })

    expect(result.enabled).toBe(false)
    if (result.enabled) throw new Error("expected disabled config")
    expect(result.reason).toContain("tiers.fast")
  })

  it("disables routing for unsupported permission values", () => {
    const result = parseRouterOptions({
      tiers: {
        fast: "packycode/fast-model",
        standard: "packycode/standard-model",
        reasoning: "packycode/reasoning-model",
      },
      permissions: {
        fastBash: "allow",
      },
    })

    expect(result.enabled).toBe(false)
    if (result.enabled) throw new Error("expected disabled config")
    expect(result.reason).toContain("permissions.fastBash")
  })
})
