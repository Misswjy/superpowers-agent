import { describe, expect, it } from "vitest"
import { routeTask } from "../src/routing-policy.js"

describe("routeTask", () => {
  it("routes read-only code exploration to fast", () => {
    const result = routeTask({
      role: "explorer",
      description: "Search the codebase and map files",
      prompt: "Use rg to find auth handlers, inspect files, and summarize evidence without editing.",
    })

    expect(result.tier).toBe("fast")
    expect(result.reason).toContain("exploration")
  })

  it("routes ordinary implementation to standard", () => {
    const result = routeTask({
      role: "implementer",
      description: "Implement local config validation",
      prompt: "Modify one TypeScript file and add a focused unit test.",
    })

    expect(result.tier).toBe("standard")
    expect(result.reason).toContain("default")
  })

  it("routes architecture and algorithm work to reasoning", () => {
    const result = routeTask({
      role: "worker",
      description: "Design an algorithm for model routing",
      prompt: "This requires architecture judgment, logic-heavy scoring, and cross-module integration.",
    })

    expect(result.tier).toBe("reasoning")
    expect(result.reason).toContain("reasoning")
  })

  it("routes review tasks to reasoning", () => {
    const result = routeTask({
      role: "reviewer",
      description: "Spec compliance review",
      prompt: "Review the implementation against the spec and code quality requirements.",
    })

    expect(result.tier).toBe("reasoning")
    expect(result.reason).toContain("review")
  })

  it("routes ambiguous tasks to standard", () => {
    const result = routeTask({
      description: "Handle the next small task",
      prompt: "Make the requested update.",
    })

    expect(result.tier).toBe("standard")
    expect(result.reason).toContain("default")
  })

  it("prefers reasoning when exploration is tied to high-risk analysis", () => {
    const result = routeTask({
      role: "explorer",
      description: "Search for the root cause of a concurrency bug",
      prompt: "Inspect locking, state coordination, and cross-module flow without editing.",
    })

    expect(result.tier).toBe("reasoning")
    expect(result.reason).toContain("reasoning")
  })
})
