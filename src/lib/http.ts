import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Polite fetching for ingest (server and scripts only, never the browser):
// one request at a time per host, a minimum gap between requests, an
// identifying User-Agent, backoff on 429/503, and an optional disk cache.

export const DAY = 24 * 60 * 60 * 1000;

export function userAgent() {
  const contact = process.env.CONTACT_EMAIL;
  return `Encore/0.1 (setlist higher-or-lower game; https://github.com/christhom94/encore${contact ? `; ${contact}` : ""})`;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    /** Set when a bot-protection layer (e.g. AWS WAF) asked for a browser challenge. */
    readonly challenged = false,
  ) {
    super(challenged ? `Blocked by bot protection (HTTP ${status}) for ${url}` : `HTTP ${status} for ${url}`);
  }
}

interface PoliteOptions {
  /** Minimum gap between request starts to this host, in ms. */
  minIntervalMs?: number;
  /** Requests allowed in flight at once (default 1: strictly one at a time). */
  concurrency?: number;
  /** Cache directory for response bodies; omit to disable caching. */
  cacheDir?: string;
  maxRetries?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface GetOptions {
  headers?: Record<string, string>;
  /** Serve from cache when younger than this (ms). 0 skips the cache. */
  cacheTtlMs?: number;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class PoliteFetcher {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  /** Earliest time the next request may start. */
  private nextSlot = 0;
  private readonly concurrency: number;
  private readonly minInterval: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly maxRetries: number;

  constructor(private readonly opts: PoliteOptions = {}) {
    this.minInterval = opts.minIntervalMs ?? 2000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? realSleep;
    this.now = opts.now ?? Date.now;
    this.maxRetries = opts.maxRetries ?? 4;
    this.concurrency = Math.max(1, opts.concurrency ?? 1);
  }

  /**
   * GET a URL as text. Cached answers return at once; otherwise the request
   * waits for a free slot (at most `concurrency` in flight) and starts no
   * sooner than minIntervalMs after the previous one.
   */
  async getText(url: string, options: GetOptions = {}): Promise<string> {
    const cached = await this.readCache(url, options.cacheTtlMs ?? 0);
    if (cached !== null) return cached;
    await this.acquire();
    try {
      return await this.fetchText(url, options);
    } finally {
      this.release();
    }
  }

  private async acquire() {
    if (this.active < this.concurrency) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve)); // the slot is handed over
  }

  private release() {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }

  async getJson<T>(url: string, options: GetOptions = {}): Promise<T> {
    return JSON.parse(await this.getText(url, options)) as T;
  }

  private async fetchText(url: string, { headers = {} }: GetOptions): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      const now = this.now();
      const start = Math.max(now, this.nextSlot);
      this.nextSlot = start + this.minInterval;
      if (start > now) await this.sleep(start - now);

      const res = await this.fetchImpl(url, { headers: { "User-Agent": userAgent(), ...headers } });
      // A WAF challenge comes back as 202 with an empty body: never treat it as content.
      const challenged = !!res.headers.get("x-amzn-waf-action");
      if (res.status === 200 && !challenged) {
        const body = await res.text();
        if (body.length > 0) await this.writeCache(url, body);
        return body;
      }
      if (challenged || (res.ok && res.status !== 200)) throw new HttpError(res.status, url, challenged);
      if ((res.status === 429 || res.status === 503) && attempt < this.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await this.sleep(retryAfter > 0 ? retryAfter * 1000 : this.minInterval * 2 ** (attempt + 1));
        continue;
      }
      throw new HttpError(res.status, url);
    }
  }

  private cachePath(url: string) {
    return this.opts.cacheDir && join(this.opts.cacheDir, createHash("sha1").update(url).digest("hex"));
  }

  private async readCache(url: string, ttl: number): Promise<string | null> {
    const path = this.cachePath(url);
    if (!path || ttl <= 0) return null;
    try {
      const s = await stat(path);
      if (this.now() - s.mtimeMs > ttl) return null;
      return await readFile(path, "utf8");
    } catch {
      return null;
    }
  }

  private async writeCache(url: string, body: string) {
    const path = this.cachePath(url);
    if (!path || !this.opts.cacheDir) return;
    await mkdir(this.opts.cacheDir, { recursive: true });
    await writeFile(path, body);
  }
}
