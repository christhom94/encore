import { Game } from "@/components/Game";
import { SAMPLE_ARTIST, SAMPLE_DECK } from "@/data/sample-deck";

// Stage 1: the game on the sample deck. Real data arrives in Stage 4.
export default function HomePage() {
  return <Game artist={SAMPLE_ARTIST} deck={SAMPLE_DECK} />;
}
