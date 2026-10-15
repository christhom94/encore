import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractAccent } from "@/lib/accent";
import { contrast, hexToRgb, INK } from "@/lib/color";

const sample = (f: string) => join(__dirname, "../../public/sample", f);

function expectClose(actual: string | null, expected: string) {
  expect(actual).not.toBeNull();
  const a = hexToRgb(actual!),
    e = hexToRgb(expected);
  a.forEach((v, i) => expect(Math.abs(v - e[i]), `${actual} vs ${expected}`).toBeLessThanOrEqual(2));
}

describe("extractAccent", () => {
  it("Master of Puppets gives orange #DA621B", async () => {
    expectClose(await extractAccent(sample("master-of-puppets.png")), "#DA621B");
  });

  it("…And Justice for All gives the logo green #CFDB94", async () => {
    expectClose(await extractAccent(sample("ajfa.jpg")), "#CFDB94");
  });

  it("the Black Album has no usable colour", async () => {
    expect(await extractAccent(sample("black-album.jpg"))).toBeNull();
  });

  it("always leaves ink text readable on the accent", async () => {
    for (const f of ["master-of-puppets.png", "ajfa.jpg"]) {
      const hex = await extractAccent(sample(f));
      expect(contrast(hex!, INK)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
