# Superpowers Agent Router Design

Date: 2026-04-29
Status: Approved for implementation planning

## Purpose

Build a companion OpenCode plugin that improves Superpowers subagent model allocation without forking or modifying Superpowers itself. The plugin routes Superpowers-triggered subagent work to hidden OpenCode subagents backed by explicitly configured model tiers.

The first version optimizes for compatibility, predictable behavior, and easy testing. It does not intercept or rewrite Task tool calls at runtime.

## Goals

- Route Superpowers subagent work to the least powerful model that can handle the task.
- Use explicit `fast`, `standard`, and `reasoning` model tiers from OpenCode plugin options.
- Keep the routing scope limited to Superpowers-triggered subagent work.
- Preserve Superpowers workflow philosophy: small tasks, fresh subagents, curated context, review checkpoints, and conservative escalation.
- Remain compatible with existing OpenCode configuration and user-defined agents.

## Non-Goals

- Do not fork or rewrite Superpowers.
- Do not route all OpenCode subagent calls globally.
- Do not use an LLM classifier in the first version.
- Do not auto-discover model quality from providers.
- Do not depend on unstable Task tool argument shapes.

## Reference Points

- OpenCode plugins can be loaded from local files or npm packages and can modify config, tools, system context, and events.
- OpenCode agents support `model`, `mode: subagent`, `hidden`, permissions, and task invocation controls.
- OpenCode subagents inherit the invoking primary agent model when no model is configured, so explicit subagent model assignment is the stable fix.
- OpenCode model identifiers use `provider/model` format, and variants/options can be configured separately in OpenCode config.

References:

- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/config/
- https://opencode.ai/docs/models/

## Chosen Approach

Use a companion plugin that injects a small set of hidden Superpowers-specific subagents into OpenCode config and injects a short routing instruction into the chat system context.

This gives OpenCode's native Task/subagent mechanism the correct agent choices, while avoiding brittle runtime mutation of Task calls.

## Architecture

### RouterPlugin

The OpenCode plugin entry point. It receives plugin options, validates tier configuration, registers hidden agents through the `config` hook, and injects routing instructions through `experimental.chat.system.transform`.

Responsibilities:

- Parse and validate options.
- Disable routing cleanly when configuration is invalid.
- Merge generated agent config into existing OpenCode config.
- Avoid overwriting user-defined agents unless a future explicit override option is added.
- Log enabled routing agents and disabled states.

### TierConfig

User-provided model tier configuration.

Required fields:

- `fast`: quick model for code exploration and mechanical read-only tasks.
- `standard`: default model for ordinary implementation, local fixes, tests, and docs.
- `reasoning`: strongest model for complex reasoning, broad integration, debugging, and review.

Model values must use OpenCode's `provider/model` format. The plugin validates shape only; it does not call provider/model APIs during startup.

### RoutingPolicy

A deterministic rule policy that maps Superpowers subagent task intent to a model tier. In the first version it is used to generate and test routing guidance, not to rewrite Task calls.

Inputs:

- Subagent role or intended agent name.
- Task description.
- Prompt text.
- Superpowers workflow phase.
- Risk and complexity keywords.
- File count or cross-module hints when present.

Outputs:

- Target tier: `fast`, `standard`, or `reasoning`.
- A short reason string for diagnostics and tests.

### AgentFactory

Generates hidden OpenCode subagent definitions with stable names and clear descriptions.

Generated agents:

- `superpowers-router-fast-explorer`
- `superpowers-router-standard-worker`
- `superpowers-router-reasoning-worker`
- `superpowers-router-reviewer`

All generated agents use `mode: subagent` and `hidden: true`.

### InstructionInjector

Injects concise routing guidance for primary agents. The text is conditional: it only applies when executing Superpowers workflows that dispatch subagents.

The instruction tells the primary agent to use:

- `superpowers-router-fast-explorer` for code search, file browsing, mapping, inspection, and evidence collection.
- `superpowers-router-standard-worker` for normal implementation, local fixes, tests, docs, and well-specified tasks.
- `superpowers-router-reasoning-worker` for complex implementation, algorithms, math, root-cause analysis, architecture, concurrency, security, data model changes, and cross-module work.
- `superpowers-router-reviewer` for spec compliance review, code quality review, final review, and high-judgment validation.

When uncertain, it must choose `superpowers-router-standard-worker`.

## Routing Rules

### Fast Tier

Use for read-heavy or mechanical exploration tasks:

- Search, find, grep, glob, list, read, scan, locate.
- Map code paths or summarize files.
- Collect evidence from existing files.
- Syntax-only or structure-only analysis.
- Explorer-style tasks with no edits.

Default permissions:

- Allow read/list/grep/glob.
- Deny edit/write.
- Bash defaults to `deny`, configurable as `ask`.

### Standard Tier

Use for ordinary execution tasks:

- Clear implementation plan.
- 1-3 files.
- Local bug fixes.
- Adding or updating tests.
- Small refactors within existing patterns.
- Config updates.
- Documentation changes.

This is the fallback tier when routing confidence is low.

Default permissions:

- Use normal worker/build-style permissions.
- Allow edits needed to complete implementation tasks.

### Reasoning Tier

Use for tasks requiring stronger judgment:

- Architecture or design decisions.
- Algorithm design.
- Math-heavy or logic-heavy work.
- Root-cause debugging.
- Security review.
- Concurrency and state coordination.
- Data model changes.
- Cross-module integration.
- Broad codebase understanding.
- Spec compliance, code quality, and final reviews.

Default permissions:

- `superpowers-router-reasoning-worker`: implementation-capable.
- `superpowers-router-reviewer`: read-only by default, edit/write denied, bash configurable as `ask`.

### Conflict Handling

When a task matches both `fast` and `reasoning`, choose `reasoning`. Examples: "search for the cause of a concurrency bug" and "inspect security-sensitive auth flow."

When a task matches no rule or confidence is unclear, choose `standard`.

## Plugin Options

Example:

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

Required:

- `tiers.fast`
- `tiers.standard`
- `tiers.reasoning`

Optional:

- `permissions.fastBash`: `deny` or `ask`, default `deny`.
- `permissions.reviewerBash`: `deny` or `ask`, default `ask`.
- `logLevel`: `debug`, `info`, `warn`, or `error`, default `info`.

Deferred options:

- `overrideAgents`: not in first version.
- `interceptTaskCalls`: not in first version.
- External config file support: not in first version.
- LLM classifier: not in first version.

## Config Merge Behavior

The plugin merges generated agents into `config.agent`.

If a generated name already exists, the plugin:

1. Leaves the user's agent unchanged.
2. Skips that generated agent.
3. Logs a warning.

If one or more agents are skipped, routing remains partially enabled for the agents that could be generated. If a required tier config is invalid, routing is fully disabled and no system routing instruction is injected.

## System Instruction Behavior

The injected instruction must be short and scoped:

- It applies only to Superpowers workflows.
- It does not alter normal user-invoked agents.
- It does not override higher-priority system, developer, OpenCode, or project instructions.
- It does not replace Superpowers skills; it only guides subagent selection.

Draft instruction:

```text
When executing a Superpowers workflow and dispatching a subagent, prefer the hidden superpowers-router agents. Use superpowers-router-fast-explorer for read-only code exploration, search, mapping, and evidence collection. Use superpowers-router-standard-worker for ordinary implementation, tests, docs, and well-specified local fixes. Use superpowers-router-reasoning-worker for complex reasoning, algorithms, math, root-cause debugging, architecture, security, data model, concurrency, or cross-module work. Use superpowers-router-reviewer for spec compliance, code quality, and final reviews. If uncertain, use superpowers-router-standard-worker. This routing only applies to Superpowers-triggered subagent work.
```

## Error Handling

Invalid tiers:

- Disable routing.
- Log an error.
- Do not inject generated agents or system routing instruction.
- Leave OpenCode and Superpowers behavior unchanged.

Agent name conflict:

- Keep the user-defined agent.
- Skip the generated conflicting agent.
- Log a warning.

Unknown task type:

- Route to `standard` through the instruction fallback.

Permission-related failure:

- Let Superpowers' normal escalation process handle it: add context, use a more capable model, split the task, or ask the human.

Unsupported OpenCode hook:

- Degrade to no-op for that capability.
- Do not break Superpowers baseline behavior.

## Testing Strategy

### Unit Tests

Test `RoutingPolicy` as pure logic:

- Code search prompt routes to `fast`.
- Ordinary implementation prompt routes to `standard`.
- Algorithm, architecture, root-cause, security, and review prompts route to `reasoning`.
- Ambiguous prompt routes to `standard`.
- Conflicting fast/reasoning signals route to `reasoning`.

### Config Merge Tests

Test agent injection:

- Empty config receives all generated agents.
- Existing unrelated agents are preserved.
- Existing generated-name conflicts are preserved and skipped.
- Invalid tiers produce no injected agents.
- Permission options produce expected agent permissions.

### Hook Simulation Tests

Test plugin behavior with mocked hook inputs:

- Valid options register config and system transform behavior.
- Invalid options leave config untouched.
- System instruction is injected only when routing is enabled.
- Logs include enabled tier and conflict diagnostics.

### Manual Acceptance

After installation:

- OpenCode loads the plugin without startup errors.
- Hidden `superpowers-router-*` agents exist in config/runtime agent list.
- A Superpowers code exploration subtask is directed to the fast explorer.
- A normal Superpowers implementation subtask is directed to the standard worker.
- A Superpowers review subtask is directed to the reviewer.
- Invalid config leaves existing Superpowers behavior intact.

## Compatibility Notes

This design intentionally uses stable OpenCode capabilities:

- Plugin config hook.
- Agent configuration.
- Hidden subagents.
- Agent model assignment.
- System transform hook.

It avoids runtime Task mutation because the Task tool argument shape is not treated as a stable public contract for this first version.

## Future Enhancements

- Optional Task call interception if OpenCode exposes a stable Task argument contract.
- Optional hybrid classifier: rules first, LLM classifier only for low-confidence cases.
- Project-specific routing profiles.
- Provider/model validation through an explicit diagnostic command.
- Telemetry-free local routing reports for debugging model usage decisions.
- An installer command that patches OpenCode config with a local package reference.

## Acceptance Criteria

- The plugin package is npm-ready and written in TypeScript.
- Users configure exactly three model tiers through OpenCode plugin options.
- The plugin injects hidden Superpowers router agents without overwriting user agents.
- The plugin injects concise Superpowers-only routing guidance.
- The routing policy is deterministic and covered by unit tests.
- Invalid configuration degrades to the existing OpenCode/Superpowers behavior.
- No Superpowers source files are forked or modified.
