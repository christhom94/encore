import { connection } from "next/server";
import { getDb } from "@/db/client";
import { popularArtists } from "@/server/game";

// GET /api/artists/popular: artists we have counts for, most setlists first.
export async function GET() {
  await connection(); // per request: the list changes as artists are ingested
  return Response.json(
    { artists: await popularArtists(getDb()) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
