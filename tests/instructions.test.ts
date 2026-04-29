import { describe, expect, it } from "vitest"
import { buildSystemInstruction } from "../src/instructions.js"

describe("buildSystemInstruction", () => {
  it("mentions all hidden router agents and Superpowers scope", () => {
    const instruction = buildSystemInstruction()

    expect(instruction).toContain("Superpowers workflow")
    expect(instruction).toContain("superpowers-router-fast-explorer")
    expect(instruction).toContain("superpowers-router-standard-worker")
    expect(instruction).toContain("superpowers-router-reasoning-worker")
    expect(instruction).toContain("superpowers-router-reviewer")
    expect(instruction).toContain("only applies to Superpowers-triggered subagent work")
  })

  it("keeps the instruction compact", () => {
    const instruction = buildSystemInstruction()

    expect(instruction.length).toBeLessThan(900)
  })
})
