import type { Artist, Card } from "@/game/types";

// Sample data from design/prototype/index.html: a hard-coded Metallica deck with
// real setlist.fm counts (Oct 2026). Replaced by the database in Stage 4.
// trackId = the Deezer recording matched at ingest (Stage 3), for real previews.

export const SAMPLE_ARTIST: Artist = {
  id: "65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab",
  name: "Metallica",
  totalSetlists: 2198,
  photo: "/sample/metallica-band.jpg",
};

const COVER = {
  mop: "/sample/master-of-puppets.png",
  ajfa: "/sample/ajfa.jpg",
  black: "/sample/black-album.jpg",
} as const;

// Extracted from the covers at ingest (see extractAccent). null = default red.
const ACCENT = { mop: "#DA621B", ajfa: "#CFDB94", black: null } as const;

// prettier-ignore
export const SAMPLE_DECK: Card[] = [
  { id: "one", title: "One", album: "...And Justice for All", year: 1988, count: 1646, line: 1400, rank: 5, cover: COVER.ajfa, accent: ACCENT.ajfa, trackId: 547126262 },
  { id: "fade-to-black", title: "Fade to Black", album: "Ride the Lightning", year: 1984, count: 1286, line: 1500, rank: 9, cover: null, accent: null, trackId: 136408184 },
  { id: "enter-sandman", title: "Enter Sandman", album: "Metallica", year: 1991, count: 1464, line: 1600, rank: 6, cover: COVER.black, accent: ACCENT.black, trackId: 136408134 },
  { id: "master-of-puppets", title: "Master of Puppets", album: "Master of Puppets", year: 1986, count: 1803, line: 1500, rank: 1, cover: COVER.mop, accent: ACCENT.mop, trackId: 425695572 },
  { id: "creeping-death", title: "Creeping Death", album: "Ride the Lightning", year: 1984, count: 1683, line: 1200, rank: 2, cover: null, accent: null, trackId: 136408190 },
  { id: "sad-but-true", title: "Sad but True", album: "Metallica", year: 1991, count: 1443, line: 1500, rank: 7, cover: COVER.black, accent: ACCENT.black, trackId: 136408136 },
  { id: "nothing-else-matters", title: "Nothing Else Matters", album: "Metallica", year: 1991, count: 1338, line: 1000, rank: 8, cover: COVER.black, accent: ACCENT.black, trackId: 136408148 },
  { id: "battery", title: "Battery", album: "Master of Puppets", year: 1986, count: 1018, line: 1250, rank: 11, cover: COVER.mop, accent: ACCENT.mop, trackId: 425695562 },
  { id: "harvester-of-sorrow", title: "Harvester of Sorrow", album: "...And Justice for All", year: 1988, count: 873, line: 700, rank: 14, cover: COVER.ajfa, accent: ACCENT.ajfa, trackId: 547126282 },
  { id: "whiplash", title: "Whiplash", album: "Kill 'Em All", year: 1983, count: 998, line: 1100, rank: 12, cover: null, accent: null, trackId: 136408168 },
];

/** Home screen "Popular now" tiles that are not wired up yet. */
export const SAMPLE_POPULAR = [
  { name: "Oasis", photo: "/sample/oasis.jpg", position: "50% 22%" },
  { name: "Pearl Jam", photo: "/sample/pearl-jam.jpg", position: "40% 30%" },
];
