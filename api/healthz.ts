import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(_request: IncomingMessage, response: ServerResponse): void {
  const payload = JSON.stringify({
    ok: true,
    service: "discussion-vote-app",
  });

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(payload);
}
