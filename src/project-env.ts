import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envLinePattern = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/;

export function loadProjectEnv(): void {
  for (const fileName of [".env", ".env.local"]) {
    const filePath = resolve(process.cwd(), fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const contents = readFileSync(filePath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) {
        continue;
      }

      const match = line.match(envLinePattern);

      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;

      if (process.env[key] !== undefined) {
        continue;
      }

      process.env[key] = normalizeEnvValue(rawValue);
    }
  }
}

function normalizeEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

