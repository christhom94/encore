import { DeezerError } from "@/lib/deezer";
import { previewExpiry, previewUrl } from "@/lib/preview";

// GET /api/preview/:trackId → { url, expiresAt } with a fresh 30-second Deezer
// preview URL. The browser plays the MP3 but never calls Deezer's API itself.

export async function GET(_req: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const id = Number(trackId);
  if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: "Bad track id" }, { status: 400 });

  try {
    const url = await previewUrl(id);
    if (!url) return Response.json({ error: "No preview for this track" }, { status: 404 });
    return Response.json(
      { url, expiresAt: previewExpiry(url) },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    const status = err instanceof DeezerError ? 404 : 502;
    return Response.json({ error: "Preview unavailable" }, { status });
  }
}
