// Runs once when a Next.js server starts. Starts the background ingest worker
// for long-running servers (dev and `next start`). Set INGEST_WORKER=off to run
// it elsewhere (`npm run worker`, or a scheduled job at deploy).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.INGEST_WORKER === "off") return;
  const { startWorker } = await import("./ingest/worker");
  startWorker();
}
