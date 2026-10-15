import { describe, expect, it } from "vitest";
import {
  albumScore,
  cleanAlbumTitle,
  normaliseTitle,
  originalYear,
  pickBest,
  pickDeezerArtist,
  trackKeys,
  type Candidate,
  type DeezerAlbum,
  type DeezerTrack,
} from "@/lib/deezer";
import { yearFromReleaseGroups } from "@/lib/musicbrainz";

const METALLICA = 119;
const album = (id: number, title: string, release_date: string, record_type = "album"): DeezerAlbum => ({
  id,
  title,
  release_date,
  record_type,
});
const track = (id: number, title: string, artistId = METALLICA): DeezerTrack => ({
  id,
  title,
  title_short: title,
  artist: { id: artistId, name: artistId === METALLICA ? "Metallica" : "Someone" },
});

// Shapes taken from Metallica's real Deezer catalogue (October 2026).
const MOP = album(51188172, "Master of Puppets (Remastered)", "1986-03-03");
const MOP_BOX = album(51189732, "Master of Puppets (Remastered Deluxe Box Set)", "1986-03-03");
const SM = album(14590448, "S&M", "1999-11-23");
const RTL_REM = album(14590600, "Ride The Lightning (Remastered)", "2016-04-15");
const RTL_DLX = album(14590610, "Ride The Lightning (Deluxe Remaster)", "1984-07-27");
const GARAGE = album(14590450, "Garage, Inc.", "1998-11-24");
const LIVE_SINGLE = album(167046842, "For Whom the Bell Tolls (Live)", "2020-08-20", "single");

describe("normaliseTitle", () => {
  it.each([
    ["Master Of Puppets (Remastered)", "master of puppets"],
    ["Master of Puppets", "master of puppets"],
    ["Seek & Destroy", "seek and destroy"],
    ["Seek And Destroy (Remastered 2016)", "seek and destroy"],
    ["Welcome Home (Sanitarium)", "welcome home sanitarium"],
    ["Welcome Home (Sanitarium) (Remastered)", "welcome home sanitarium"],
    ["(Anesthesia) Pulling Teeth", "anesthesia pulling teeth"],
    ["...And Justice for All", "and justice for all"],
    ["Fuel - Live at Reading Festival", "fuel"],
    ["Ain’t My Bitch", "aint my bitch"],
    ["Lux Æterna", "lux æterna"],
    ["Am I Evil? (Diamond Head cover)", "am i evil"],
  ])("%s → %s", (input, out) => {
    expect(normaliseTitle(input)).toBe(out);
  });
});

describe("cleanAlbumTitle", () => {
  it("drops edition suffixes only", () => {
    expect(cleanAlbumTitle("Ride The Lightning (Deluxe Remaster)")).toBe("Ride The Lightning");
    expect(cleanAlbumTitle("Master of Puppets (Remastered Deluxe Box Set)")).toBe("Master of Puppets");
    expect(cleanAlbumTitle("Hardwired…To Self-Destruct (Deluxe)")).toBe("Hardwired…To Self-Destruct");
    expect(cleanAlbumTitle("Garage, Inc.")).toBe("Garage, Inc.");
  });
});

describe("albumScore", () => {
  it("prefers studio albums over live records, compilations, EPs and singles", () => {
    expect(albumScore(MOP)).toBeLessThan(albumScore(MOP_BOX));
    expect(albumScore(MOP_BOX)).toBeLessThan(albumScore(SM));
    expect(albumScore(album(1, "Greatest Hits", "2000-01-01", "compile"))).toBeGreaterThan(100);
    expect(albumScore(album(2, "Some EP", "2000-01-01", "ep"))).toBeLessThan(albumScore(LIVE_SINGLE));
  });
});

describe("pickBest", () => {
  it("chooses the studio recording over live versions and other artists", () => {
    const candidates: Candidate[] = [
      { track: track(1, "Master Of Puppets (Live with the SFSO)"), album: SM },
      { track: track(2, "Master of Puppets", 999), album: album(3, "Tribute", "2001-01-01") },
      { track: track(3, "Master Of Puppets (Remastered)"), album: MOP_BOX },
      { track: track(4, "Master Of Puppets (Remastered)"), album: MOP },
    ];
    expect(pickBest("Master of Puppets", METALLICA, candidates)?.track.id).toBe(4);
  });

  it("falls back to a live recording when that is all there is", () => {
    const only: Candidate[] = [{ track: track(9, "For Whom the Bell Tolls (Live)"), album: LIVE_SINGLE }];
    expect(pickBest("For Whom the Bell Tolls", METALLICA, only)?.track.id).toBe(9);
  });

  it("matches a song inside a combined track such as Last Caress/Green Hell", () => {
    const combined = track(7, "Last Caress/Green Hell");
    const keys = trackKeys(combined);
    expect(keys.map((k) => k.key)).toEqual(["last caressgreen hell", "last caress", "green hell"]);
    const candidates: Candidate[] = [{ track: combined, album: GARAGE, partial: true }];
    expect(pickBest("Green Hell", METALLICA, candidates)?.album.id).toBe(GARAGE.id);
  });

  it("returns null when nothing matches", () => {
    expect(pickBest("Mastertarium", METALLICA, [])).toBeNull();
  });
});

describe("release year", () => {
  it("uses the earliest album with the same cleaned title", () => {
    expect(originalYear(RTL_REM, [RTL_REM, RTL_DLX, MOP])).toBe(1984);
  });

  it("reads the first release year from MusicBrainz release groups", () => {
    const res = {
      "release-groups": [
        { title: "…And Justice for All", score: 100, "first-release-date": "1988-08-25" },
        { title: "…And Justice for All (live)", score: 80, "first-release-date": "1989-01-01" },
      ],
    };
    expect(yearFromReleaseGroups(res, "...And Justice for All")).toBe(1988);
    expect(yearFromReleaseGroups({}, "Anything")).toBeNull();
  });
});

describe("pickDeezerArtist", () => {
  it("takes the exact name with the most fans", () => {
    const results = [
      { id: 117054162, name: "SaD - Symphony and Metallica", nb_fan: 700 },
      { id: 5, name: "Metallica", nb_fan: 12 },
      { id: 119, name: "Metallica", nb_fan: 8169461 },
    ];
    expect(pickDeezerArtist(results, "Metallica")?.id).toBe(119);
    expect(pickDeezerArtist(results, "Megadeth")).toBeNull();
  });
});
