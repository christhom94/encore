import { describe, expect, it } from "vitest";
import { previewExpiry } from "@/lib/preview";

describe("previewExpiry", () => {
  it("reads the signed expiry from a Deezer preview URL", () => {
    const url =
      "https://cdnt-preview.dzcdn.net/api/1/1/a/2/6/0/a26b.mp3?hdnea=exp=1792071346~acl=/api/1/1/a/2/6/0/a26b.mp3*~data=user_id=0,application_id=42~hmac=b7c9";
    expect(previewExpiry(url)).toBe(1792071346000);
    expect(previewExpiry("https://example.com/a.mp3")).toBeNull();
  });
});
