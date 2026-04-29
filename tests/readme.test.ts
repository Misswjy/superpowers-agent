import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

describe("README", () => {
  it("documents installation, config, generated agents, and first-version limits", () => {
    const readme = readFileSync("README.md", "utf8")

    expect(readme).toContain("superpowers-agent-router")
    expect(readme).toContain("tiers")
    expect(readme).toContain("superpowers-router-fast-explorer")
    expect(readme).toContain("superpowers-router-standard-worker")
    expect(readme).toContain("superpowers-router-reasoning-worker")
    expect(readme).toContain("superpowers-router-reviewer")
    expect(readme).toContain("第一版不拦截 Task 参数")
  })
})
