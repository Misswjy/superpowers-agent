import type { ModelTier } from "./types.js"

export type RoutingInput = {
  role?: string
  description?: string
  prompt?: string
  phase?: string
}

export type RoutingDecision = {
  tier: ModelTier
  reason: string
}

const REVIEW_SIGNALS = [
  "review",
  "spec compliance",
  "code quality",
  "final reviewer",
  "quality reviewer",
  "compliance reviewer",
]

const REASONING_SIGNALS = [
  "architecture",
  "architectural",
  "algorithm",
  "math",
  "mathematics",
  "logic-heavy",
  "root cause",
  "debugging",
  "security",
  "concurrency",
  "race condition",
  "state coordination",
  "data model",
  "cross-module",
  "integration",
  "broad codebase",
  "reasoning",
]

const FAST_SIGNALS = [
  "search",
  "find",
  "grep",
  "glob",
  "list",
  "read",
  "scan",
  "locate",
  "inspect",
  "map",
  "summarize",
  "evidence",
  "exploration",
  "explorer",
  "without editing",
  "read-only",
]

function haystack(input: RoutingInput): string {
  return [input.role, input.description, input.prompt, input.phase]
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .toLowerCase()
}

function containsAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal))
}

export function routeTask(input: RoutingInput): RoutingDecision {
  const text = haystack(input)

  if (containsAny(text, REVIEW_SIGNALS)) {
    return { tier: "reasoning", reason: "review task requires reasoning tier" }
  }

  if (containsAny(text, REASONING_SIGNALS)) {
    return { tier: "reasoning", reason: "reasoning signal matched" }
  }

  if (containsAny(text, FAST_SIGNALS)) {
    return { tier: "fast", reason: "exploration signal matched" }
  }

  return { tier: "standard", reason: "default standard tier" }
}
