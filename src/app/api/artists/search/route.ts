import { getDb } from "@/db/client";
import { searchAll } from "@/server/game";

// GET /api/artists/search?q=metallica: our database first, then setlist.fm.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length > 100) return Response.json({ error: "Query too long" }, { status: 400 });
  const body = await searchAll(getDb(), q);
  return Response.json(body, { headers: { "Cache-Control": "private, max-age=60" } });
}
