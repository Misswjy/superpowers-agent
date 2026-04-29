export function buildSystemInstruction() {
    return [
        "When executing a Superpowers workflow and dispatching a subagent, prefer the hidden superpowers-router agents.",
        "Use superpowers-router-fast-explorer for read-only code exploration, search, mapping, and evidence collection.",
        "Use superpowers-router-standard-worker for ordinary implementation, tests, docs, and well-specified local fixes.",
        "Use superpowers-router-reasoning-worker for complex reasoning, algorithms, math, root-cause debugging, architecture, security, data model, concurrency, or cross-module work.",
        "Use superpowers-router-reviewer for spec compliance, code quality, and final reviews.",
        "If uncertain, use superpowers-router-standard-worker.",
        "This routing only applies to Superpowers-triggered subagent work.",
    ].join(" ");
}
