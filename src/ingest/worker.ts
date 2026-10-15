import { getDb, migrateDb } from "@/db/client";
import { claimNext, requeueStale, runJob } from "./queue";

// The background ingest worker: drains the queue one job at a time.
// Started in-process by src/instrumentation.ts for a long-running server
// (npm run dev / npm start), or standalone with `npm run worker`.

const key = Symbol.for("encore.ingestWorker");
type Global = typeof globalThis & { [key]?: { stop: () => void } };

export function startWorker({ db = getDb(), intervalMs = 3000, log = console.log } = {}) {
  const g = globalThis as Global;
  if (g[key]) return g[key]; // one worker per process, even with hot reload

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    try {
      const job = await claimNext(db);
      if (job) {
        await runJob(db, job, (m) => log(`[ingest] ${m}`));
        timer = setTimeout(tick, 0); // more may be waiting
        return;
      }
    } catch (err) {
      log(`[ingest] worker error: ${err}`);
    }
    timer = setTimeout(tick, intervalMs);
  };

  const ready = (async () => {
    await migrateDb(db);
    await requeueStale(db);
  })();
  ready.then(tick, (err) => log(`[ingest] worker could not start: ${err}`));

  const handle = {
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      delete g[key];
    },
  };
  g[key] = handle;
  return handle;
}
