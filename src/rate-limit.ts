const GRAPHQL_PATH = "/graphql";

let graphQlCooldownUntil = 0;

export class GraphQlRateLimitError extends Error {
  readonly retryAfterSeconds: number;
  readonly reason: "cooldown" | "primary" | "secondary";

  constructor(
    message: string,
    retryAfterSeconds: number,
    reason: "cooldown" | "primary" | "secondary",
  ) {
    super(message);
    this.name = "GraphQlRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.reason = reason;
  }
}

export function isGraphQlRequest(options: { method?: string; url?: string }): boolean {
  return options.method === "POST" && options.url === GRAPHQL_PATH;
}

export function getGraphQlCooldownRetryAfterSeconds(now = Date.now()): number {
  if (graphQlCooldownUntil <= now) {
    return 0;
  }

  return Math.max(1, Math.ceil((graphQlCooldownUntil - now) / 1000));
}

export function rememberGraphQlCooldown(retryAfterSeconds: number): void {
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return;
  }

  graphQlCooldownUntil = Math.max(
    graphQlCooldownUntil,
    Date.now() + retryAfterSeconds * 1000,
  );
}

export function throwIfGraphQlCooldownActive(): void {
  const retryAfterSeconds = getGraphQlCooldownRetryAfterSeconds();

  if (retryAfterSeconds > 0) {
    throw new GraphQlRateLimitError(
      "GitHub GraphQL rate-limit cooldown is still active.",
      retryAfterSeconds,
      "cooldown",
    );
  }
}

export function toGraphQlRateLimitError(error: unknown): GraphQlRateLimitError | null {
  if (error instanceof GraphQlRateLimitError) {
    return error;
  }

  const candidate = error as {
    message?: string;
    response?: {
      headers?: Record<string, string | number | undefined>;
      data?: {
        errors?: Array<{ type?: string; message?: string }>;
      };
    };
  };
  const headers = candidate.response?.headers ?? {};
  const responseErrors = candidate.response?.data?.errors ?? [];
  const message = candidate.message ?? "";
  const retryAfterHeader = toPositiveNumber(headers["retry-after"]);
  const rateLimitResetHeader = toPositiveNumber(headers["x-ratelimit-reset"]);

  if (/secondary rate/i.test(message)) {
    return new GraphQlRateLimitError(
      "GitHub secondary rate limit blocked the GraphQL title update.",
      retryAfterHeader ?? 60,
      "secondary",
    );
  }

  const isPrimaryRateLimit =
    headers["x-ratelimit-remaining"] === "0" ||
    /rate limit exceeded/i.test(message) ||
    /request quota exhausted/i.test(message) ||
    responseErrors.some((item) => item.type === "RATE_LIMITED") ||
    /GraphQL Rate Limit Exceeded/i.test(message);

  if (!isPrimaryRateLimit) {
    return null;
  }

  const retryAfterSeconds =
    retryAfterHeader ??
    (rateLimitResetHeader
      ? Math.max(Math.ceil(rateLimitResetHeader - Date.now() / 1000) + 1, 1)
      : 60);

  return new GraphQlRateLimitError(
    "GitHub GraphQL quota is exhausted for the current installation token.",
    retryAfterSeconds,
    "primary",
  );
}

function toPositiveNumber(value: string | number | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
