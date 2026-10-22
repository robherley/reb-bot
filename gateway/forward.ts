import { setTimeout as sleep } from "node:timers/promises";
import type { MessagePayload } from "./messages.ts";

const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRY_DELAY_MS = 30_000;

export function retryDelay(value: string | null, now = Date.now()): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, seconds * 1000));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(MAX_RETRY_DELAY_MS, Math.max(0, date - now)) : 0;
}

interface ForwardOptions {
  url: URL;
  secret: string;
  bypassSecret?: string;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  sleepImpl?: (delay: number, signal: AbortSignal) => Promise<void>;
}

async function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  await sleep(delay, undefined, { signal });
}

export async function forwardMessage(payload: MessagePayload, options: ForwardOptions): Promise<void> {
  const { url, secret, bypassSecret, signal, fetchImpl = fetch, sleepImpl = waitForRetry } = options;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    signal.throwIfAborted();
    let retryAfter = 0;
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        redirect: "error",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
          ...(bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      });
      await response.body?.cancel();
      if (response.ok) return;
      if (response.status !== 429 && response.status < 500) {
        throw new PermanentDeliveryError(`Gateway endpoint returned ${response.status}`);
      }
      retryAfter = retryDelay(response.headers.get("retry-after"));
    } catch (error) {
      if (signal.aborted) signal.throwIfAborted();
      if (error instanceof PermanentDeliveryError) throw error;
      // Do not propagate network errors that may contain credentials or URLs.
    }

    if (attempt === MAX_ATTEMPTS - 1) {
      throw new Error(`Gateway delivery failed after ${MAX_ATTEMPTS} attempts`);
    }

    const delay = Math.min(MAX_RETRY_DELAY_MS, Math.max(retryAfter, 1000 * 2 ** attempt));
    await sleepImpl(delay, signal);
  }
}

class PermanentDeliveryError extends Error {}
