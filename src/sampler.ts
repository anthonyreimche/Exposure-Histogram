// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// Measures a float capture after each settled render: core replaces the
// develop store's histogram when a render settles, so that is the cue. One
// capture runs at a time; a render during one, or inside the throttle after
// one started, folds into a single follow-up. A capture that resolves after
// the photo changed, or after refresh() (the source changed), is dropped.

import { measure, type Measurement } from "./ev";
import type { DevelopParams, DevelopState, FloatFrame } from "./safelight";

export const THROTTLE_MS = 150;

export type SampledState = Pick<DevelopState, "photoId" | "params" | "previewParams" | "histogram">;

export interface SamplerDeps<S extends SampledState> {
  develop: { getState(): S; subscribe(listener: (state: S, prev: S) => void): () => void };
  capture(params: DevelopParams): Promise<FloatFrame | null>;
  paramsFor(state: S): DevelopParams;
  publish(measurement: Measurement | null): void;
  throttleMs?: number;
}

export interface Sampler {
  stop(): void;
  /** Measure again now that what is measured changed. */
  refresh(): void;
}

export function startSampler<S extends SampledState>(deps: SamplerDeps<S>): Sampler {
  const { develop, capture, paramsFor, publish } = deps;
  const throttle = deps.throttleMs ?? THROTTLE_MS;
  let stopped = false;
  let inFlight = false;
  let queued = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastStart = -Infinity;
  let generation = 0;

  function run(): void {
    timer = null;
    const state = develop.getState();
    if (stopped || state.photoId === null) return;
    inFlight = true;
    lastStart = Date.now();
    const started = generation;
    const current = () => !stopped && started === generation;
    capture(paramsFor(state))
      .then(
        (frame) => {
          if (current()) publish(frame ? measure(frame.data) : null);
        },
        () => {
          if (current()) publish(null);
        },
      )
      .finally(() => {
        inFlight = false;
        if (queued && !stopped) {
          queued = false;
          request();
        }
      });
  }

  function request(): void {
    if (stopped) return;
    if (inFlight) {
      queued = true;
      return;
    }
    if (timer !== null) return;
    timer = setTimeout(run, Math.max(0, throttle - (Date.now() - lastStart)));
  }

  function cancelTimer(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  const unsubscribe = develop.subscribe((state, prev) => {
    if (state.photoId !== prev.photoId) generation++;
    if (state.photoId === null) {
      queued = false;
      cancelTimer();
      publish(null);
      return;
    }
    if (state.histogram !== prev.histogram || state.photoId !== prev.photoId) request();
  });

  request();

  return {
    stop() {
      stopped = true;
      unsubscribe();
      cancelTimer();
    },
    refresh() {
      generation++;
      request();
    },
  };
}
