export default function handler(
  _request: unknown,
  response: {
    setHeader(name: string, value: string): void;
    status(code: number): { json(payload: unknown): void };
  },
): void {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    ok: true,
    service: "discussion-vote-app",
  });
}
