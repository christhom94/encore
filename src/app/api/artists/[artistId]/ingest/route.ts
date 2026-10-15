import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { artists } from "@/db/schema";
import { enqueueIngest } from "@/ingest/queue";

// POST /api/artists/:mbid/ingest { name }: queue a background ingest.
// Never fetches anything itself; the worker does (see src/ingest/worker.ts).
const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  if (!MBID.test(artistId)) return Response.json({ error: "Bad artist id" }, { status: 400 });

  const db = getDb();
  const existing = await db.query.artists.findFirst({ where: eq(artists.mbid, artistId) });
  if (existing?.countsUpdatedAt) return Response.json({ status: "ready" });

  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : "this artist";
  const job = await enqueueIngest(db, { mbid: artistId, name });
  return Response.json({ status: job.status }, { status: 202 });
}
