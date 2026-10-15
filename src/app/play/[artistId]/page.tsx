import { Suspense } from "react";
import { PlayLoading, PlayRoute } from "@/components/PlayRoute";

// /play/[artistId] (MusicBrainz ID). /play/sample plays the prototype's sample deck.
export default function PlayPage() {
  return (
    <Suspense fallback={<PlayLoading />}>
      <PlayRoute />
    </Suspense>
  );
}
