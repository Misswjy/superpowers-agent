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
