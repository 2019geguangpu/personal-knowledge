import pino, { type Logger as PinoLogger } from "pino";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const APP_LOG_PATH = "/data/logs/knowledge-base/app.log";

function ensureLogDir() {
  const dir = path.dirname(APP_LOG_PATH);
  mkdirSync(dir, { recursive: true });
}

function isoTimestamp() {
  return `,"timestamp":"${new Date().toISOString()}"`;
}

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogBaseFields = {
  level: LogLevel;
  timestamp: string;
  trace_id: string;
  module: string;
  action: string;
  msg: string;
  latency_ms: number;
  user_id?: string;
};

type Logger = PinoLogger;

let rootLogger: Logger | null = null;

function baseOptions() {
  return {
    base: null,
    level: "info",
    messageKey: "msg",
    timestamp: isoTimestamp,
    formatters: {
      level(label: string) {
        return { level: label.toUpperCase() };
      },
    },
  } as const;
}

export function getLogger(): Logger {
  if (rootLogger) return rootLogger;
  ensureLogDir();

  // 可选：使用 pino-roll 作为 transport 做“每日轮转 + 保留 7 份”
  // 注意：pino-roll 的轮转文件名是 `app.2026-05-08.1.log` 这种点分格式（非 `app-2026-05-08.log`）
  if (process.env.LOG_ROTATION === "pino-roll") {
    const transport = pino.transport({
      target: "pino-roll",
      options: {
        file: APP_LOG_PATH,
        frequency: "daily",
        mkdir: true,
        dateFormat: "yyyy-MM-dd",
        limit: { count: 7 },
      },
    });
    rootLogger = pino(baseOptions(), transport);
    return rootLogger;
  }

  rootLogger = pino(
    baseOptions(),
    pino.destination({
      dest: APP_LOG_PATH,
      sync: false,
    }),
  );
  return rootLogger;
}

export function createRequestLogger(input: {
  trace_id: string;
  user_id?: string;
  module: string;
}) {
  const logger = getLogger().child({
    trace_id: input.trace_id,
    user_id: input.user_id,
    module: input.module,
  });

  function info(fields: Omit<LogBaseFields, "level" | "timestamp" | "trace_id" | "module"> & Record<string, unknown>) {
    logger.info(fields);
  }
  function warn(fields: Omit<LogBaseFields, "level" | "timestamp" | "trace_id" | "module"> & Record<string, unknown>) {
    logger.warn(fields);
  }
  function error(fields: Omit<LogBaseFields, "level" | "timestamp" | "trace_id" | "module"> & Record<string, unknown>) {
    logger.error(fields);
  }

  return { logger, info, warn, error };
}

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      error_name: err.name,
      error_message: err.message,
      error_stack: err.stack,
      ...(typeof (err as any).code === "string" ? { error_code: (err as any).code } : {}),
    };
  }
  return { error_raw: err };
}

