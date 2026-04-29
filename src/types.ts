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
