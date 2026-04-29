# Superpowers Agent Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 npm-ready 的 TypeScript OpenCode 伴生插件，为 Superpowers 触发的 subagent 工作注入隐藏路由 agents，并按显式三档模型配置引导任务分配。

**Architecture:** 插件采用小模块组合：配置校验、规则路由、agent 生成、config 合并、系统说明注入和 OpenCode plugin 入口彼此独立。第一版不改写 Task 参数，只使用 OpenCode config hook 与 system transform hook。所有核心逻辑先用纯函数测试覆盖，再接入插件入口。

**Tech Stack:** TypeScript, ESM, Vitest, OpenCode `@opencode-ai/plugin` 类型包。

---

## 文件结构

- `package.json`：npm 包元数据、构建命令、测试命令和依赖声明。
- `tsconfig.json`：TypeScript ESM 编译配置。
- `vitest.config.ts`：Vitest 测试配置。
- `src/index.ts`：OpenCode plugin 入口，导出 `SuperpowersAgentRouter`。
- `src/types.ts`：共享类型定义。
- `src/config.ts`：plugin options 解析与校验。
- `src/routing-policy.ts`：确定性任务分类与档位选择规则。
- `src/agents.ts`：隐藏 subagent 配置生成。
- `src/config-merge.ts`：将生成 agents 安全合并进 OpenCode config。
- `src/instructions.ts`：Superpowers 专用系统路由说明生成。
- `src/logger.ts`：OpenCode client log 的小封装，测试中可替换。
- `tests/*.test.ts`：按模块组织的单元与 hook 模拟测试。
- `README.md`：安装、配置和限制说明。

## 实现任务

### Task 1: 初始化 TypeScript 插件包骨架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `tests/index.test.ts`

- [ ] **Step 1: 写入 package 与 TypeScript/Vitest 配置**

创建 `package.json`：

```json
{
  "name": "superpowers-agent-router",
  "version": "0.1.0",
  "description": "OpenCode companion plugin that routes Superpowers subagents across explicit model tiers.",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "package.json"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "check": "tsc -p tsconfig.json --noEmit",
    "verify": "npm run check && npm test && npm run build"
  },
  "keywords": [
    "opencode",
    "superpowers",
    "subagent",
    "model-routing"
  ],
  "license": "MIT",
  "peerDependencies": {
    "@opencode-ai/plugin": ">=1.3.15"
  },
  "devDependencies": {
    "@opencode-ai/plugin": "^1.3.15",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "src/**/*.ts"
  ]
}
```

创建 `vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 2: 写一个失败的入口导出测试**

创建 `tests/index.test.ts`：

```ts
import { describe, expect, it } from "vitest"
import { SuperpowersAgentRouter } from "../src/index.js"

describe("SuperpowersAgentRouter", () => {
  it("exports an OpenCode plugin factory", () => {
    expect(typeof SuperpowersAgentRouter).toBe("function")
  })
})
```

- [ ] **Step 3: 创建最小入口实现**

创建 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
```

- [ ] **Step 4: 安装依赖并验证测试通过**

Run:

```bash
npm install
npm test
npm run build
```

Expected:

```text
1 test passed
dist/index.js and dist/index.d.ts are generated
```

- [ ] **Step 5: 提交骨架**

```bash
git add package.json tsconfig.json vitest.config.ts src/index.ts tests/index.test.ts
git commit -m "chore: scaffold opencode plugin package"
```

### Task 2: 实现配置类型与校验

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `tests/config.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 写配置校验失败测试**

创建 `tests/config.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/config.test.ts
```

Expected:

```text
FAIL tests/config.test.ts
Cannot find module '../src/config.js'
```

- [ ] **Step 3: 实现共享类型**

创建 `src/types.ts`：

```ts
export type ModelTier = "fast" | "standard" | "reasoning"

export type BashPermission = "deny" | "ask"

export type LogLevel = "debug" | "info" | "warn" | "error"

export type TierConfig = {
  fast: string
  standard: string
  reasoning: string
}

export type RouterPermissions = {
  fastBash: BashPermission
  reviewerBash: BashPermission
}

export type RouterConfig = {
  tiers: TierConfig
  permissions: RouterPermissions
  logLevel: LogLevel
}

export type EnabledRouterConfig = {
  enabled: true
  config: RouterConfig
}

export type DisabledRouterConfig = {
  enabled: false
  reason: string
}

export type RouterConfigResult = EnabledRouterConfig | DisabledRouterConfig
```

- [ ] **Step 4: 实现配置解析**

创建 `src/config.ts`：

```ts
import type {
  BashPermission,
  LogLevel,
  RouterConfig,
  RouterConfigResult,
} from "./types.js"

const MODEL_ID_PATTERN = /^[^/\s]+\/[^/\s]+$/
const BASH_PERMISSIONS = new Set<BashPermission>(["deny", "ask"])
const LOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === "string" ? value : undefined
}

function invalid(reason: string): RouterConfigResult {
  return { enabled: false, reason }
}

function validateModelId(field: string, value: string | undefined): string | RouterConfigResult {
  if (!value) return invalid(`Missing required model tier: ${field}`)
  if (!MODEL_ID_PATTERN.test(value)) {
    return invalid(`Invalid model tier ${field}: expected provider/model`)
  }
  return value
}

function validateBashPermission(field: string, value: unknown, fallback: BashPermission): BashPermission | RouterConfigResult {
  if (value === undefined) return fallback
  if (typeof value === "string" && BASH_PERMISSIONS.has(value as BashPermission)) {
    return value as BashPermission
  }
  return invalid(`Invalid ${field}: expected deny or ask`)
}

function validateLogLevel(value: unknown): LogLevel | RouterConfigResult {
  if (value === undefined) return "info"
  if (typeof value === "string" && LOG_LEVELS.has(value as LogLevel)) {
    return value as LogLevel
  }
  return invalid("Invalid logLevel: expected debug, info, warn, or error")
}

export function parseRouterOptions(options: unknown): RouterConfigResult {
  if (!isRecord(options)) {
    return invalid("Plugin options must be an object with tiers.fast, tiers.standard, and tiers.reasoning")
  }

  const tiersInput = options.tiers
  if (!isRecord(tiersInput)) {
    return invalid("Missing required tiers object")
  }

  const fast = validateModelId("tiers.fast", readString(tiersInput, "fast"))
  if (typeof fast !== "string") return fast

  const standard = validateModelId("tiers.standard", readString(tiersInput, "standard"))
  if (typeof standard !== "string") return standard

  const reasoning = validateModelId("tiers.reasoning", readString(tiersInput, "reasoning"))
  if (typeof reasoning !== "string") return reasoning

  const permissionsInput = isRecord(options.permissions) ? options.permissions : {}

  const fastBash = validateBashPermission("permissions.fastBash", permissionsInput.fastBash, "deny")
  if (typeof fastBash !== "string") return fastBash

  const reviewerBash = validateBashPermission("permissions.reviewerBash", permissionsInput.reviewerBash, "ask")
  if (typeof reviewerBash !== "string") return reviewerBash

  const logLevel = validateLogLevel(options.logLevel)
  if (typeof logLevel !== "string") return logLevel

  const config: RouterConfig = {
    tiers: { fast, standard, reasoning },
    permissions: { fastBash, reviewerBash },
    logLevel,
  }

  return { enabled: true, config }
}
```

- [ ] **Step 5: 导出配置 API 并验证**

修改 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"

export { parseRouterOptions } from "./config.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
```

Run:

```bash
npm test -- tests/config.test.ts
npm run check
```

Expected:

```text
5 tests passed
TypeScript check passes
```

- [ ] **Step 6: 提交配置校验**

```bash
git add src/index.ts src/types.ts src/config.ts tests/config.test.ts
git commit -m "feat: validate router plugin options"
```

### Task 3: 实现确定性 RoutingPolicy

**Files:**
- Create: `src/routing-policy.ts`
- Create: `tests/routing-policy.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 写路由策略失败测试**

创建 `tests/routing-policy.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/routing-policy.test.ts
```

Expected:

```text
FAIL tests/routing-policy.test.ts
Cannot find module '../src/routing-policy.js'
```

- [ ] **Step 3: 实现路由策略**

创建 `src/routing-policy.ts`：

```ts
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
```

- [ ] **Step 4: 导出路由 API 并验证**

修改 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"

export { parseRouterOptions } from "./config.js"
export { routeTask } from "./routing-policy.js"
export type { RoutingDecision, RoutingInput } from "./routing-policy.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
```

Run:

```bash
npm test -- tests/routing-policy.test.ts
npm run check
```

Expected:

```text
6 tests passed
TypeScript check passes
```

- [ ] **Step 5: 提交路由策略**

```bash
git add src/index.ts src/routing-policy.ts tests/routing-policy.test.ts
git commit -m "feat: add deterministic routing policy"
```

### Task 4: 生成隐藏 Superpowers Router Agents

**Files:**
- Create: `src/agents.ts`
- Create: `tests/agents.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 写 agent 生成失败测试**

创建 `tests/agents.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/agents.test.ts
```

Expected:

```text
FAIL tests/agents.test.ts
Cannot find module '../src/agents.js'
```

- [ ] **Step 3: 实现 AgentFactory**

创建 `src/agents.ts`：

```ts
import type { RouterConfig } from "./types.js"

export const ROUTER_AGENT_NAMES = [
  "superpowers-router-fast-explorer",
  "superpowers-router-standard-worker",
  "superpowers-router-reasoning-worker",
  "superpowers-router-reviewer",
] as const

export type RouterAgentName = (typeof ROUTER_AGENT_NAMES)[number]

export type RouterAgentConfig = {
  description: string
  mode: "subagent"
  hidden: true
  model: string
  permission?: Record<string, unknown>
}

export type RouterAgents = Record<RouterAgentName, RouterAgentConfig>

export function buildRouterAgents(config: RouterConfig): RouterAgents {
  return {
    "superpowers-router-fast-explorer": {
      description:
        "Use for Superpowers code exploration tasks that search, inspect, read, map, or summarize code without editing.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.fast,
      permission: {
        read: "allow",
        list: "allow",
        grep: "allow",
        glob: "allow",
        edit: "deny",
        write: "deny",
        bash: config.permissions.fastBash,
      },
    },
    "superpowers-router-standard-worker": {
      description:
        "Use for ordinary Superpowers implementation tasks with clear scope, local fixes, tests, docs, and well-specified changes.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.standard,
    },
    "superpowers-router-reasoning-worker": {
      description:
        "Use for complex Superpowers tasks requiring architecture, algorithms, math, root-cause debugging, security, data model, concurrency, or cross-module reasoning.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.reasoning,
    },
    "superpowers-router-reviewer": {
      description:
        "Use for Superpowers review tasks including spec compliance review, code quality review, final review, and high-judgment validation.",
      mode: "subagent",
      hidden: true,
      model: config.tiers.reasoning,
      permission: {
        read: "allow",
        list: "allow",
        grep: "allow",
        glob: "allow",
        edit: "deny",
        write: "deny",
        bash: config.permissions.reviewerBash,
      },
    },
  }
}
```

- [ ] **Step 4: 导出 agent API 并验证**

修改 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"

export { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js"
export type { RouterAgentConfig, RouterAgentName, RouterAgents } from "./agents.js"
export { parseRouterOptions } from "./config.js"
export { routeTask } from "./routing-policy.js"
export type { RoutingDecision, RoutingInput } from "./routing-policy.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
```

Run:

```bash
npm test -- tests/agents.test.ts
npm run check
```

Expected:

```text
3 tests passed
TypeScript check passes
```

- [ ] **Step 5: 提交 agent 生成器**

```bash
git add src/index.ts src/agents.ts tests/agents.test.ts
git commit -m "feat: generate hidden router agents"
```

### Task 5: 实现 OpenCode config 合并与冲突处理

**Files:**
- Create: `src/config-merge.ts`
- Create: `tests/config-merge.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 写配置合并失败测试**

创建 `tests/config-merge.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/config-merge.test.ts
```

Expected:

```text
FAIL tests/config-merge.test.ts
Cannot find module '../src/config-merge.js'
```

- [ ] **Step 3: 实现 config 合并**

创建 `src/config-merge.ts`：

```ts
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
```

- [ ] **Step 4: 导出合并 API 并验证**

修改 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"

export { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js"
export type { RouterAgentConfig, RouterAgentName, RouterAgents } from "./agents.js"
export { mergeRouterAgents } from "./config-merge.js"
export type { MergeResult } from "./config-merge.js"
export { parseRouterOptions } from "./config.js"
export { routeTask } from "./routing-policy.js"
export type { RoutingDecision, RoutingInput } from "./routing-policy.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
```

Run:

```bash
npm test -- tests/config-merge.test.ts
npm run check
```

Expected:

```text
3 tests passed
TypeScript check passes
```

- [ ] **Step 5: 提交 config 合并**

```bash
git add src/index.ts src/config-merge.ts tests/config-merge.test.ts
git commit -m "feat: merge router agents into opencode config"
```

### Task 6: 实现系统路由说明注入

**Files:**
- Create: `src/instructions.ts`
- Create: `tests/instructions.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 写说明生成失败测试**

创建 `tests/instructions.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/instructions.test.ts
```

Expected:

```text
FAIL tests/instructions.test.ts
Cannot find module '../src/instructions.js'
```

- [ ] **Step 3: 实现说明生成**

创建 `src/instructions.ts`：

```ts
export function buildSystemInstruction(): string {
  return [
    "When executing a Superpowers workflow and dispatching a subagent, prefer the hidden superpowers-router agents.",
    "Use superpowers-router-fast-explorer for read-only code exploration, search, mapping, and evidence collection.",
    "Use superpowers-router-standard-worker for ordinary implementation, tests, docs, and well-specified local fixes.",
    "Use superpowers-router-reasoning-worker for complex reasoning, algorithms, math, root-cause debugging, architecture, security, data model, concurrency, or cross-module work.",
    "Use superpowers-router-reviewer for spec compliance, code quality, and final reviews.",
    "If uncertain, use superpowers-router-standard-worker.",
    "This routing only applies to Superpowers-triggered subagent work.",
  ].join(" ")
}
```

- [ ] **Step 4: 导出说明 API 并验证**

修改 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"

export { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js"
export type { RouterAgentConfig, RouterAgentName, RouterAgents } from "./agents.js"
export { mergeRouterAgents } from "./config-merge.js"
export type { MergeResult } from "./config-merge.js"
export { parseRouterOptions } from "./config.js"
export { buildSystemInstruction } from "./instructions.js"
export { routeTask } from "./routing-policy.js"
export type { RoutingDecision, RoutingInput } from "./routing-policy.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async () => {
  return {}
}

export default SuperpowersAgentRouter
```

Run:

```bash
npm test -- tests/instructions.test.ts
npm run check
```

Expected:

```text
2 tests passed
TypeScript check passes
```

- [ ] **Step 5: 提交系统说明生成器**

```bash
git add src/index.ts src/instructions.ts tests/instructions.test.ts
git commit -m "feat: build superpowers routing instruction"
```

### Task 7: 接入 OpenCode Plugin hooks 与日志

**Files:**
- Create: `src/logger.ts`
- Create: `tests/plugin.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: 写 plugin hook 失败测试**

创建 `tests/plugin.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/plugin.test.ts
```

Expected:

```text
FAIL tests/plugin.test.ts
Expected config.agent to be defined
```

- [ ] **Step 3: 实现日志封装**

创建 `src/logger.ts`：

```ts
import type { PluginInput } from "@opencode-ai/plugin"
import type { LogLevel } from "./types.js"

export type RouterLogger = {
  debug(message: string, extra?: Record<string, unknown>): Promise<void>
  info(message: string, extra?: Record<string, unknown>): Promise<void>
  warn(message: string, extra?: Record<string, unknown>): Promise<void>
  error(message: string, extra?: Record<string, unknown>): Promise<void>
}

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export function createLogger(input: PluginInput, minimumLevel: LogLevel): RouterLogger {
  async function write(level: LogLevel, message: string, extra: Record<string, unknown> = {}): Promise<void> {
    if (ORDER[level] < ORDER[minimumLevel]) return

    await input.client.app.log({
      body: {
        service: "superpowers-agent-router",
        level,
        message,
        extra,
      },
    })
  }

  return {
    debug: (message, extra) => write("debug", message, extra),
    info: (message, extra) => write("info", message, extra),
    warn: (message, extra) => write("warn", message, extra),
    error: (message, extra) => write("error", message, extra),
  }
}
```

- [ ] **Step 4: 实现 plugin hook 集成**

修改 `src/index.ts`：

```ts
import type { Plugin } from "@opencode-ai/plugin"
import { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js"
import { mergeRouterAgents } from "./config-merge.js"
import { parseRouterOptions } from "./config.js"
import { buildSystemInstruction } from "./instructions.js"
import { createLogger } from "./logger.js"

export { buildRouterAgents, ROUTER_AGENT_NAMES } from "./agents.js"
export type { RouterAgentConfig, RouterAgentName, RouterAgents } from "./agents.js"
export { mergeRouterAgents } from "./config-merge.js"
export type { MergeResult } from "./config-merge.js"
export { parseRouterOptions } from "./config.js"
export { buildSystemInstruction } from "./instructions.js"
export { createLogger } from "./logger.js"
export type { RouterLogger } from "./logger.js"
export { routeTask } from "./routing-policy.js"
export type { RoutingDecision, RoutingInput } from "./routing-policy.js"
export type {
  BashPermission,
  LogLevel,
  ModelTier,
  RouterConfig,
  RouterConfigResult,
  RouterPermissions,
  TierConfig,
} from "./types.js"

export const SuperpowersAgentRouter: Plugin = async (input, options) => {
  const parsed = parseRouterOptions(options)
  const logLevel = parsed.enabled ? parsed.config.logLevel : "info"
  const logger = createLogger(input, logLevel)

  if (!parsed.enabled) {
    await logger.error("Superpowers agent routing disabled", { reason: parsed.reason })
    return {
      config: async () => {},
      "experimental.chat.system.transform": async () => {},
    }
  }

  const routerAgents = buildRouterAgents(parsed.config)
  const systemInstruction = buildSystemInstruction()

  await logger.info("Superpowers agent routing enabled", {
    agents: ROUTER_AGENT_NAMES,
    tiers: parsed.config.tiers,
  })

  return {
    config: async (config) => {
      const result = mergeRouterAgents(config as Record<string, unknown>, routerAgents)

      if (result.skipped.length > 0) {
        await logger.warn("Skipped router agents because user config already defines them", {
          skipped: result.skipped,
        })
      }

      await logger.debug("Merged router agents into OpenCode config", {
        added: result.added,
        skipped: result.skipped,
      })
    },
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(systemInstruction)
    },
  }
}

export default SuperpowersAgentRouter
```

- [ ] **Step 5: 验证 plugin hook 测试与全量检查**

Run:

```bash
npm test -- tests/plugin.test.ts
npm run verify
```

Expected:

```text
2 plugin tests passed
All tests pass
TypeScript check passes
Build passes
```

- [ ] **Step 6: 提交 plugin 集成**

```bash
git add src/index.ts src/logger.ts tests/plugin.test.ts
git commit -m "feat: wire router into opencode plugin hooks"
```

### Task 8: 补充 README 与配置示例

**Files:**
- Create: `README.md`
- Create: `tests/readme.test.ts`

- [ ] **Step 1: 写 README 内容测试**

创建 `tests/readme.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm test -- tests/readme.test.ts
```

Expected:

```text
FAIL tests/readme.test.ts
ENOENT: no such file or directory, open 'README.md'
```

- [ ] **Step 3: 编写 README**

创建 `README.md`：

````md
# superpowers-agent-router

`superpowers-agent-router` 是一个 OpenCode 伴生插件，用于优化 Superpowers workflow 中 subagent 的模型分配策略。

第一版不 fork、不修改 Superpowers，也不拦截 Task 参数。插件通过 OpenCode config hook 注入隐藏 subagents，并通过 system transform hook 注入一段仅限 Superpowers subagent 派发的路由说明。

## 配置

在 OpenCode 配置中使用 plugin options 显式配置三档模型：

```json
{
  "plugin": [
    ["superpowers-agent-router", {
      "tiers": {
        "fast": "provider/model-fast",
        "standard": "provider/model-standard",
        "reasoning": "provider/model-reasoning"
      },
      "permissions": {
        "fastBash": "deny",
        "reviewerBash": "ask"
      },
      "logLevel": "info"
    }]
  ]
}
```

必填：

- `tiers.fast`
- `tiers.standard`
- `tiers.reasoning`

可选：

- `permissions.fastBash`: `deny` 或 `ask`，默认 `deny`
- `permissions.reviewerBash`: `deny` 或 `ask`，默认 `ask`
- `logLevel`: `debug`、`info`、`warn` 或 `error`，默认 `info`

## 生成的隐藏 agents

- `superpowers-router-fast-explorer`: 代码搜索、文件浏览、路径映射、证据收集等只读探索任务。
- `superpowers-router-standard-worker`: 普通实现、局部修复、测试、文档和需求明确的小任务。
- `superpowers-router-reasoning-worker`: 算法、架构、根因分析、安全、并发、数据模型和跨模块任务。
- `superpowers-router-reviewer`: spec compliance review、code quality review 和 final review。

## 路由范围

路由说明只适用于 Superpowers workflow 派发 subagent 的场景。它不改变普通用户手动 `@agent` 调用，也不接管其他 OpenCode 插件。

## 第一版限制

- 第一版不拦截 Task 参数。
- 第一版不使用 LLM 分类器。
- 第一版不自动发现 provider/model 能力。
- 第一版不覆盖用户已有同名 agents。

## 开发命令

```bash
npm install
npm run verify
```
````

- [ ] **Step 4: 验证 README 测试**

Run:

```bash
npm test -- tests/readme.test.ts
npm run verify
```

Expected:

```text
README test passes
All tests pass
TypeScript check passes
Build passes
```

- [ ] **Step 5: 提交 README**

```bash
git add README.md tests/readme.test.ts
git commit -m "docs: document router plugin usage"
```

### Task 9: 最终验收与发布前检查

**Files:**
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: 检查包入口与文件清单**

Run:

```bash
npm run verify
npm pack --dry-run
```

Expected:

```text
npm run verify exits 0
npm pack --dry-run lists dist/index.js, dist/index.d.ts, README.md, package.json
```

- [ ] **Step 2: 检查 package scripts 是否完整**

确认 `package.json` scripts 仍为：

```json
{
  "build": "tsc -p tsconfig.json",
  "test": "vitest run",
  "check": "tsc -p tsconfig.json --noEmit",
  "verify": "npm run check && npm test && npm run build"
}
```

如果不一致，修改为上述内容。

- [ ] **Step 3: 检查 README 是否包含本地安装示例**

如果 README 缺少本地路径安装示例，补充：

````md
## 本地开发安装

在 OpenCode 配置中可以先使用本地包路径进行验证：

```json
{
  "plugin": [
    ["file:/Users/xingzhan/Documents/superpowers-agent", {
      "tiers": {
        "fast": "provider/model-fast",
        "standard": "provider/model-standard",
        "reasoning": "provider/model-reasoning"
      }
    }]
  ]
}
```
````

- [ ] **Step 4: 运行最终验证**

Run:

```bash
npm run verify
git status --short
```

Expected:

```text
All tests pass
TypeScript check passes
Build passes
git status only shows intentional README/package changes before commit
```

- [ ] **Step 5: 提交最终检查**

```bash
git add package.json README.md
git commit -m "chore: prepare router plugin package"
```

## 计划自检

### Spec 覆盖

- 伴生插件、不 fork Superpowers：Task 1、Task 7、Task 8 覆盖。
- 显式三档模型配置：Task 2 覆盖。
- 只路由 Superpowers 触发的 subagent：Task 6、Task 8 覆盖。
- 隐藏 agents：Task 4、Task 5、Task 7 覆盖。
- 规则优先与 standard 兜底：Task 3 覆盖。
- 配置冲突与错误降级：Task 2、Task 5、Task 7 覆盖。
- 测试策略：Task 2 到 Task 8 覆盖纯函数、合并、hook 模拟和文档测试。
- npm-ready TypeScript 包：Task 1、Task 9 覆盖。

### 占位符检查

计划中没有待填写字段。所有新增文件都有明确内容，所有验证步骤都有命令和期望结果。

### 类型一致性

- `RouterConfig`、`RouterConfigResult`、`ModelTier`、`RouterPermissions` 均由 `src/types.ts` 定义并复用。
- `buildRouterAgents` 接收 `RouterConfig`，返回 `RouterAgents`。
- `mergeRouterAgents` 接收 `RouterAgents` 并返回 `MergeResult`。
- plugin 入口只在 `parseRouterOptions` 返回 enabled 后注入 agents 和 system instruction。
