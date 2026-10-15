import { getDb } from "@/db/client";
import { getDeck } from "@/server/game";

// GET /api/game/:mbid/deck[?seed=n]: a fresh shuffled deck with lines, or the
// artist's state (pending ingest, failed, too few songs, unknown).
export async function GET(req: Request, { params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  const seedParam = new URL(req.url).searchParams.get("seed");
  const seed = seedParam !== null && /^\d{1,10}$/.test(seedParam) ? Number(seedParam) : undefined;

  const result = await getDeck(getDb(), artistId, { seed });
  const status =
    result.status === "ready"
      ? 200
      : result.status === "pending"
        ? 202
        : result.status === "unknown"
          ? 404
          : 422;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
