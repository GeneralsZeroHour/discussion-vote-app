import { readFileSync } from "node:fs";

import { z } from "zod";

const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

const runtimeEnvSchema = z
  .object({
    APP_ID: z.coerce.number().int().positive(),
    PRIVATE_KEY: z.string().optional(),
    PRIVATE_KEY_PATH: z.string().optional(),
    WEBHOOK_SECRET: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3000),
    WEBHOOK_PATH: z.string().default("/api/github/webhooks"),
    LOG_LEVEL: z.enum(logLevels).default("info"),
  })
  .refine((value) => Boolean(value.PRIVATE_KEY || value.PRIVATE_KEY_PATH), {
    message: "Either PRIVATE_KEY or PRIVATE_KEY_PATH must be set.",
    path: ["PRIVATE_KEY"],
  });

export type RuntimeEnv = {
  appId: number;
  privateKey: string;
  webhookSecret: string;
  port: number;
  webhookPath: string;
  logLevel: (typeof logLevels)[number];
};

export function readRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const parsed = runtimeEnvSchema.parse(source);
  const privateKey =
    parsed.PRIVATE_KEY?.replace(/\\n/g, "\n") ??
    readFileSync(parsed.PRIVATE_KEY_PATH!, "utf8");

  return {
    appId: parsed.APP_ID,
    privateKey,
    webhookSecret: parsed.WEBHOOK_SECRET,
    port: parsed.PORT,
    webhookPath: parsed.WEBHOOK_PATH,
    logLevel: parsed.LOG_LEVEL,
  };
}

