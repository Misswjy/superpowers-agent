# Superpowers Agent Router 设计文档

日期：2026-04-29
状态：已确认设计，等待实现计划

## 目标背景

本项目要实现一个 OpenCode 伴生插件，用于优化 Superpowers 工作流中的 subagent 模型分配策略。插件不 fork、不改写 Superpowers 本体，而是在 OpenCode 层注入一组隐藏 subagent，让 Superpowers 触发的子任务可以按任务类型使用不同能力档位的模型。

第一版优先保证兼容性、可预测性和可测试性。因此，第一版不在运行时拦截或改写 Task 工具调用参数。

## 目标

- 将 Superpowers subagent 任务路由到足以完成该任务的最低成本模型档位。
- 通过 OpenCode plugin options 显式配置 `fast`、`standard`、`reasoning` 三档模型。
- 路由范围只覆盖 Superpowers 触发的 subagent 工作，不影响普通用户手动调用 agent，也不接管其他插件。
- 保持 Superpowers 的任务哲学：小任务、干净子上下文、主 agent 精准投喂上下文、分阶段 review、保守升级。
- 与现有 OpenCode 配置、用户自定义 agents 和 Superpowers 插件保持兼容。

## 非目标

- 不 fork 或重写 Superpowers。
- 不全局接管所有 OpenCode subagent 调用。
- 第一版不使用 LLM 分类器。
- 不自动判断 provider/model 的能力强弱。
- 不依赖尚未稳定公开的 Task 工具参数结构。

## 参考依据

- OpenCode plugin 支持本地文件或 npm 包加载，并可通过 hook 修改 config、tool、system context 和事件行为。
- OpenCode agent 支持 `model`、`mode: subagent`、`hidden`、权限配置和 task 调用控制。
- OpenCode subagent 如果没有显式配置模型，会继承调用它的 primary agent 模型；因此，给专用 subagent 显式绑定模型是稳定修复点。
- OpenCode 模型标识使用 `provider/model` 格式，模型 variants/options 可在 OpenCode 配置中单独维护。

参考链接：

- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/config/
- https://opencode.ai/docs/models/

## 方案选择

采用伴生插件方案：插件向 OpenCode config 注入少量隐藏的 Superpowers 专用 subagents，并向 chat system context 注入一段很短的路由说明。

这个方案使用 OpenCode 原生 Task/subagent 机制来选择正确 agent，避免在第一版中做脆弱的 Task 参数运行时改写。

## 架构

### RouterPlugin

OpenCode 插件入口。它读取 plugin options，校验模型档位配置，通过 `config` hook 注册隐藏 agents，并通过 `experimental.chat.system.transform` 注入路由说明。

职责：

- 解析并校验插件配置。
- 配置无效时干净禁用路由。
- 将生成的 agent 配置合并到现有 OpenCode config。
- 不覆盖用户已有同名 agent，除非未来显式加入 `overrideAgents` 开关。
- 记录已启用的路由 agents 和禁用原因。

### TierConfig

用户显式提供的模型档位配置。

必填字段：

- `fast`：用于代码探索和机械性只读任务的快速模型。
- `standard`：用于普通实现、局部修复、测试和文档任务的默认模型。
- `reasoning`：用于复杂推理、跨模块集成、调试和 review 的高能力模型。

模型值必须符合 OpenCode 的 `provider/model` 格式。插件只校验字符串形态，不在启动时调用 provider/model API。

### RoutingPolicy

确定性的规则策略，用于把 Superpowers subagent 任务意图映射到模型档位。第一版中，它主要用于生成路由说明、沉淀规则和编写测试，不直接改写 Task 调用。

输入：

- subagent 角色或预期 agent 名称。
- 任务 description。
- prompt 文本。
- Superpowers 工作流阶段。
- 风险与复杂度关键词。
- prompt 中出现的文件数量或跨模块提示。

输出：

- 目标档位：`fast`、`standard` 或 `reasoning`。
- 简短 reason，供诊断和测试使用。

### AgentFactory

生成隐藏 OpenCode subagent 定义，保证命名稳定、描述清晰。

生成的 agents：

- `superpowers-router-fast-explorer`
- `superpowers-router-standard-worker`
- `superpowers-router-reasoning-worker`
- `superpowers-router-reviewer`

所有生成的 agents 都使用 `mode: subagent` 和 `hidden: true`。

### InstructionInjector

向 primary agents 注入简短路由说明。说明是条件化的：只在执行 Superpowers workflow 且需要派发 subagent 时生效。

说明要求 primary agent 按以下规则选择：

- `superpowers-router-fast-explorer`：代码搜索、文件浏览、代码路径映射、检查和证据收集。
- `superpowers-router-standard-worker`：普通实现、局部修复、测试、文档和需求明确的小任务。
- `superpowers-router-reasoning-worker`：复杂实现、算法、数学、根因分析、架构、并发、安全、数据模型和跨模块工作。
- `superpowers-router-reviewer`：spec compliance review、code quality review、final review 和高判断力验收。

不确定时，必须选择 `superpowers-router-standard-worker`。

## 路由规则

### Fast 档

用于只读、探索或机械性分析任务：

- search、find、grep、glob、list、read、scan、locate。
- 映射代码路径或总结文件内容。
- 从现有文件收集证据。
- 只做语法结构或文件结构分析。
- 不需要编辑的 explorer 类任务。

默认权限：

- 允许 read/list/grep/glob。
- 拒绝 edit/write。
- bash 默认为 `deny`，可配置为 `ask`。

### Standard 档

用于普通执行任务：

- 有清晰实现计划。
- 影响 1-3 个文件。
- 局部 bug 修复。
- 添加或更新测试。
- 遵循现有模式的小型重构。
- 配置更新。
- 文档更新。

当路由置信度不足时，默认落到该档位。

默认权限：

- 使用普通 worker/build 风格权限。
- 允许完成实现任务所需的编辑能力。

### Reasoning 档

用于需要更强判断力的任务：

- 架构或设计决策。
- 算法设计。
- 数学或逻辑推理较重的工作。
- 根因调试。
- 安全 review。
- 并发和状态协调。
- 数据模型变更。
- 跨模块集成。
- 需要广泛理解代码库。
- spec compliance、code quality 和 final review。

默认权限：

- `superpowers-router-reasoning-worker`：具备实现能力。
- `superpowers-router-reviewer`：默认只读，拒绝 edit/write，bash 可配置为 `ask`。

### 冲突处理

如果一个任务同时命中 `fast` 和 `reasoning` 信号，优先选择 `reasoning`。例如：“搜索并定位并发 bug 根因”或“检查安全敏感的鉴权链路”。

如果任务没有命中明确规则，或置信度不足，选择 `standard`。

## 插件配置

配置示例：

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

- `permissions.fastBash`：`deny` 或 `ask`，默认 `deny`。
- `permissions.reviewerBash`：`deny` 或 `ask`，默认 `ask`。
- `logLevel`：`debug`、`info`、`warn` 或 `error`，默认 `info`。

暂不进入第一版的配置项：

- `overrideAgents`
- `interceptTaskCalls`
- 独立外部配置文件
- LLM 分类器

## 配置合并行为

插件将生成的 agents 合并到 `config.agent`。

如果生成的名称已经存在，插件会：

1. 保留用户已有 agent。
2. 跳过该冲突 agent 的生成。
3. 记录 warning。

如果只有部分 agents 冲突，未冲突的 agents 仍会生成，路由能力保持部分启用。如果必填 tiers 配置无效，则完全禁用路由，不注入 agents，也不注入系统路由说明。

## 系统说明注入行为

注入说明必须短，并且明确限定范围：

- 只适用于 Superpowers workflow。
- 不改变用户普通手动调用的 agents。
- 不覆盖更高优先级的 system、developer、OpenCode 或项目指令。
- 不替代 Superpowers skills，只指导 subagent 选择。

说明草案：

```text
When executing a Superpowers workflow and dispatching a subagent, prefer the hidden superpowers-router agents. Use superpowers-router-fast-explorer for read-only code exploration, search, mapping, and evidence collection. Use superpowers-router-standard-worker for ordinary implementation, tests, docs, and well-specified local fixes. Use superpowers-router-reasoning-worker for complex reasoning, algorithms, math, root-cause debugging, architecture, security, data model, concurrency, or cross-module work. Use superpowers-router-reviewer for spec compliance, code quality, and final reviews. If uncertain, use superpowers-router-standard-worker. This routing only applies to Superpowers-triggered subagent work.
```

说明草案保留英文，是因为它会作为 OpenCode 主 agent 的系统上下文使用。文档主体使用中文，运行时注入文本可在实现阶段继续评估是否提供中文/英文双语版本。

## 错误处理

tiers 无效：

- 禁用路由。
- 记录 error。
- 不注入生成 agents，也不注入系统路由说明。
- 保持 OpenCode 和 Superpowers 原始行为不变。

agent 命名冲突：

- 保留用户已有 agent。
- 跳过冲突的生成 agent。
- 记录 warning。

未知任务类型：

- 通过说明中的兜底规则路由到 `standard`。

权限不足导致失败：

- 交给 Superpowers 原有升级流程处理：补上下文、换更强模型、拆任务或询问用户。

OpenCode hook 不支持：

- 对该能力降级为 no-op。
- 不破坏 Superpowers 基线行为。

## 测试策略

### 单元测试

将 `RoutingPolicy` 作为纯逻辑测试：

- 代码搜索 prompt 路由到 `fast`。
- 普通实现 prompt 路由到 `standard`。
- 算法、架构、根因、安全和 review prompt 路由到 `reasoning`。
- 模糊 prompt 路由到 `standard`。
- 同时命中 fast/reasoning 信号时路由到 `reasoning`。

### 配置合并测试

测试 agent 注入：

- 空 config 会得到全部生成 agents。
- 已有非相关 agents 会被保留。
- 已有同名生成 agents 会被保留并跳过。
- tiers 无效时不注入 agents。
- 权限配置能生成预期 agent permissions。

### Hook 模拟测试

用 mock hook 输入测试插件行为：

- 配置有效时注册 config 与 system transform 行为。
- 配置无效时保持 config 不变。
- 仅当路由启用时注入系统说明。
- 日志包含启用档位和冲突诊断。

### 手动验收

安装后需要确认：

- OpenCode 加载插件时没有启动错误。
- runtime agent 列表中存在隐藏的 `superpowers-router-*` agents。
- Superpowers 代码探索子任务会被引导到 fast explorer。
- Superpowers 普通实现子任务会被引导到 standard worker。
- Superpowers review 子任务会被引导到 reviewer。
- 配置无效时，现有 Superpowers 行为不被破坏。

## 兼容性说明

本设计刻意只使用相对稳定的 OpenCode 能力：

- Plugin config hook。
- Agent configuration。
- Hidden subagents。
- Agent model assignment。
- System transform hook。

第一版避免运行时 Task 改写，因为 Task 工具参数形态不作为稳定公开契约处理。

## 后续增强

- 如果 OpenCode 提供稳定 Task 参数契约，可增加可选 Task 调用拦截。
- 增加混合分类器：规则优先，低置信时再用 LLM 分类。
- 支持项目级路由 profile。
- 通过显式诊断命令校验 provider/model 是否存在。
- 提供不含遥测的本地路由报告，方便排查模型选择。
- 增加 installer command，用于将本地包引用写入 OpenCode config。

## 验收标准

- 插件包是 npm-ready 的 TypeScript 项目。
- 用户通过 OpenCode plugin options 显式配置三档模型。
- 插件注入隐藏 Superpowers router agents，且不覆盖用户已有 agents。
- 插件注入简短、仅限 Superpowers 的路由说明。
- 路由策略确定性可测，并有单元测试覆盖。
- 配置无效时降级到现有 OpenCode/Superpowers 行为。
- 不 fork、不修改 Superpowers 源码。
