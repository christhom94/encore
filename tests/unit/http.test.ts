import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HttpError, PoliteFetcher } from "@/lib/http";

function fakeClock() {
  let t = 1_000_000;
  const sleeps: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
}

function fakeFetch(responses: Array<{ status: number; body?: string; headers?: Record<string, string> }>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: init?.headers as Record<string, string> });
    const r = responses.shift() ?? { status: 200, body: "ok" };
    return new Response(r.body ?? "", { status: r.status, headers: r.headers });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("PoliteFetcher", () => {
  it("spaces requests at least minIntervalMs apart and sends a User-Agent", async () => {
    const clock = fakeClock();
    const { impl, calls } = fakeFetch([]);
    const f = new PoliteFetcher({ minIntervalMs: 2000, fetchImpl: impl, ...clock });
    await Promise.all([f.getText("https://x/1"), f.getText("https://x/2"), f.getText("https://x/3")]);
    expect(calls.map((c) => c.url)).toEqual(["https://x/1", "https://x/2", "https://x/3"]);
    expect(clock.sleeps).toEqual([2000, 2000]);
    expect(calls[0].headers["User-Agent"]).toMatch(/^Encore\//);
  });

  it("backs off on 429, honouring Retry-After", async () => {
    const clock = fakeClock();
    const { impl, calls } = fakeFetch([
      { status: 429, headers: { "retry-after": "5" } },
      { status: 200, body: "done" },
    ]);
    const f = new PoliteFetcher({ minIntervalMs: 1000, fetchImpl: impl, ...clock });
    expect(await f.getText("https://x/a")).toBe("done");
    expect(calls).toHaveLength(2);
    expect(clock.sleeps).toContain(5000);
  });

  it("throws HttpError on other failures and keeps the queue going", async () => {
    const clock = fakeClock();
    const { impl } = fakeFetch([{ status: 404 }, { status: 200, body: "next" }]);
    const f = new PoliteFetcher({ minIntervalMs: 0, fetchImpl: impl, ...clock });
    await expect(f.getText("https://x/missing")).rejects.toBeInstanceOf(HttpError);
    expect(await f.getText("https://x/ok")).toBe("next");
  });

  it("serves fresh responses from the disk cache", async () => {
    const clock = fakeClock();
    const { impl, calls } = fakeFetch([
      { status: 200, body: "first" },
      { status: 200, body: "second" },
    ]);
    const cacheDir = mkdtempSync(join(tmpdir(), "encore-http-"));
    const f = new PoliteFetcher({ minIntervalMs: 0, fetchImpl: impl, cacheDir, ...clock, now: Date.now });
    expect(await f.getText("https://x/c", { cacheTtlMs: 60_000 })).toBe("first");
    expect(await f.getText("https://x/c", { cacheTtlMs: 60_000 })).toBe("first");
    expect(calls).toHaveLength(1);
    expect(await f.getText("https://x/c", { cacheTtlMs: 0 })).toBe("second");
  });
});

describe("PoliteFetcher and bot protection", () => {
  it("treats a WAF challenge (202, empty) as an error and does not cache it", async () => {
    const clock = fakeClock();
    const { impl, calls } = fakeFetch([
      { status: 202, body: "", headers: { "x-amzn-waf-action": "challenge" } },
      { status: 200, body: "<html>real</html>" },
    ]);
    const cacheDir = mkdtempSync(join(tmpdir(), "encore-waf-"));
    const f = new PoliteFetcher({ minIntervalMs: 0, fetchImpl: impl, cacheDir, ...clock, now: Date.now });
    const err = await f.getText("https://x/stats", { cacheTtlMs: 60_000 }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).challenged).toBe(true);
    expect(await f.getText("https://x/stats", { cacheTtlMs: 60_000 })).toBe("<html>real</html>");
    expect(calls).toHaveLength(2);
  });
});
