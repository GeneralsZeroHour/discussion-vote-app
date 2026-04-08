import { readFileSync } from "node:fs";

import { z } from "zod";

const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

const runtimeEnvSchema = z
  .object({
    APP_ID: z.coerce.number().int().positive().optional(),
    PRIVATE_KEY: z.string().optional(),
    PRIVATE_KEY_PATH: z.string().optional(),
    WEBHOOK_SECRET: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3000),
    WEBHOOK_PATH: z.string().default("/api/github/webhooks"),
    LOG_LEVEL: z.enum(logLevels).default("info"),
    DRY_RUN: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  })
  .superRefine((value, context) => {
    if (value.DRY_RUN) {
      return;
    }

    if (!value.APP_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "APP_ID must be set unless DRY_RUN=true.",
        path: ["APP_ID"],
      });
    }

    if (!value.PRIVATE_KEY && !value.PRIVATE_KEY_PATH) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either PRIVATE_KEY or PRIVATE_KEY_PATH must be set unless DRY_RUN=true.",
        path: ["PRIVATE_KEY"],
      });
    }
  });

export type RuntimeEnv = {
  appId?: number;
  privateKey?: string;
  webhookSecret: string;
  port: number;
  webhookPath: string;
  logLevel: (typeof logLevels)[number];
  dryRun: boolean;
};

export function readRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const parsed = runtimeEnvSchema.parse(source);
  const privateKey = parsed.PRIVATE_KEY
    ? parsed.PRIVATE_KEY.replace(/\\n/g, "\n")
    : parsed.PRIVATE_KEY_PATH
      ? readFileSync(parsed.PRIVATE_KEY_PATH, "utf8")
      : undefined;

  return {
    appId: parsed.APP_ID,
    privateKey,
    webhookSecret: parsed.WEBHOOK_SECRET,
    port: parsed.PORT,
    webhookPath: parsed.WEBHOOK_PATH,
    logLevel: parsed.LOG_LEVEL,
    dryRun: parsed.DRY_RUN,
  };
}
