// Standalone ingest worker: npm run worker (use with INGEST_WORKER=off on the web server).
import "./env";
import { startWorker } from "@/ingest/worker";

startWorker({ log: (m) => console.log(new Date().toISOString(), m) });
console.log("Ingest worker running. Ctrl+C to stop.");
