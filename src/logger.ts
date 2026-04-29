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
