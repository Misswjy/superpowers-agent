import type { PluginInput } from "@opencode-ai/plugin";
import type { LogLevel } from "./types.js";
export type RouterLogger = {
    debug(message: string, extra?: Record<string, unknown>): Promise<void>;
    info(message: string, extra?: Record<string, unknown>): Promise<void>;
    warn(message: string, extra?: Record<string, unknown>): Promise<void>;
    error(message: string, extra?: Record<string, unknown>): Promise<void>;
};
export declare function createLogger(input: PluginInput, minimumLevel: LogLevel): RouterLogger;
