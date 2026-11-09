// The sampler measures a float capture after each settled render: one capture
// at a time, throttled, with results for a photo or a source that is no
// longer current thrown away.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import type { Measurement } from "../src/ev";
import { THROTTLE_MS, startSampler, type SampledState as Slice, type Sampler } from "../src/sampler";
import type { DevelopParams, FloatFrame, HistogramData } from "../src/safelight";

const PARAMS = { exposure: 0 } as DevelopParams;

function histogram(): HistogramData {
  return { r: new Uint32Array(1), g: new Uint32Array(1), b: new Uint32Array(1), luma: new Uint32Array(1) };
}

function grey(level: number): FloatFrame {
  const data = new Float32Array(4 * 4).fill(level);
  return { data, width: 2, height: 2, space: { encoding: "linear", primaries: "rec709" }, point: "output" };
}

function rig(initial: Partial<Slice> = {}) {
  const develop = create<Slice>()(() => ({
    photoId: "p1",
    params: PARAMS,
    previewParams: null,
    histogram: histogram(),
    ...initial,
  }));
  const calls: DevelopParams[] = [];
  const pending: { resolve(f: FloatFrame | null): void; reject(e: unknown): void }[] = [];
  const published: (Measurement | null)[] = [];
  const paramsFor = vi.fn((s: Slice) => s.previewParams ?? s.params);
  let sampler: Sampler | null = null;
  const start = () => {
    sampler = startSampler({
      develop,
      capture: (params) => {
        calls.push(params);
        return new Promise((resolve, reject) => pending.push({ resolve, reject }));
      },
      paramsFor,
      publish: (m) => void published.push(m),
    });
    return sampler;
  };
  return { develop, calls, pending, published, paramsFor, start, sampler: () => sampler! };
}

/** Settles capture `i` and lets its promise chain run. */
async function settle(r: ReturnType<typeof rig>, i: number, frame: FloatFrame | null): Promise<void> {
  r.pending[i].resolve(frame);
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe("startSampler", () => {
  it("captures the params paramsFor picks as soon as it starts, and publishes the measurement", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(r.calls).toEqual([PARAMS]);
    await settle(r, 0, grey(0.18));
    expect(r.published).toHaveLength(1);
    expect(r.published[0]?.pixels).toBe(4);
  });

  it("captures nothing while no photo is open", async () => {
    const r = rig({ photoId: null });
    r.start();
    await vi.advanceTimersByTimeAsync(THROTTLE_MS * 2);
    expect(r.calls).toEqual([]);
  });

  it("captures again after a settled render, once the throttle has passed", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    await settle(r, 0, grey(0.18));
    r.develop.setState({ histogram: histogram() });
    await vi.advanceTimersByTimeAsync(THROTTLE_MS - 10);
    expect(r.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(r.calls).toHaveLength(2);
  });

  it("folds renders during a capture into one follow-up", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    r.develop.setState({ histogram: histogram() });
    r.develop.setState({ histogram: histogram() });
    r.develop.setState({ histogram: histogram() });
    await settle(r, 0, grey(0.18));
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(r.calls).toHaveLength(2);
  });

  it("drops a capture that resolves after the photo changed, and measures the new photo", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    r.develop.setState({ photoId: "p2", histogram: histogram() });
    await settle(r, 0, grey(0.18));
    expect(r.published).toEqual([]);
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(r.calls).toHaveLength(2);
    await settle(r, 1, grey(0.5));
    expect(r.published).toHaveLength(1);
  });

  it("publishes null when the photo closes", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    await settle(r, 0, grey(0.18));
    r.develop.setState({ photoId: null });
    expect(r.published.at(-1)).toBeNull();
  });

  it("re-measures on refresh, dropping the capture already under way", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    r.sampler().refresh();
    await settle(r, 0, grey(0.18));
    expect(r.published).toEqual([]);
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(r.calls).toHaveLength(2);
    expect(r.paramsFor).toHaveBeenCalledTimes(2);
  });

  it("publishes null for a frame the core can't capture, or a capture that fails", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    await settle(r, 0, null);
    expect(r.published).toEqual([null]);
    r.develop.setState({ histogram: histogram() });
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    r.pending[1].reject(new Error("GPU lost"));
    await vi.advanceTimersByTimeAsync(0);
    expect(r.published).toEqual([null, null]);
  });

  it("stops capturing and drops the capture under way when stopped", async () => {
    const r = rig();
    r.start();
    await vi.advanceTimersByTimeAsync(0);
    r.sampler().stop();
    await settle(r, 0, grey(0.18));
    r.develop.setState({ histogram: histogram() });
    await vi.advanceTimersByTimeAsync(THROTTLE_MS * 2);
    expect(r.published).toEqual([]);
    expect(r.calls).toHaveLength(1);
  });
});
