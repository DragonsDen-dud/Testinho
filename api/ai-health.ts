// Article 4 — the Connectivity Check module (E.9) pings this to confirm our
// own proxy is reachable, before Article 12's scheduled-report check ever
// attempts a real Anthropic call. Deliberately does not itself call
// Anthropic — a liveness check of the proxy shouldn't cost an API call or
// require a key just to answer "is the network path up".

export const config = { runtime: 'edge' }

export default function handler(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
