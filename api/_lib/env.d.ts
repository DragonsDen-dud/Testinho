// Vercel's Edge Runtime exposes a minimal `process.env` for reading
// environment variables, but none of Node's other globals — deliberately
// not pulling in @types/node here, since the rest of that surface (fs,
// Buffer, etc.) isn't actually available at runtime for these functions.
declare const process: { env: Record<string, string | undefined> }
