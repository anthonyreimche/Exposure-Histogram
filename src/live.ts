// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// The live reading every open copy of the panel shows. The sampler runs while
// at least one copy is mounted, and only then: a closed panel costs nothing.

import type { Measurement } from "./ev";
import { livePrefs } from "./prefs";
import { React, api } from "./rt";
import { startSampler } from "./sampler";
import { paramsForSource } from "./source";

export type Reading =
  | { kind: "waiting" }
  /** The photo is open but the core handed over no float frame. */
  | { kind: "none" }
  | { kind: "measured"; measurement: Measurement };

const WAITING: Reading = { kind: "waiting" };
const NONE: Reading = { kind: "none" };

/** The long edge of the measured frame: about 170 000 pixels for a 3:2 photo. */
const MAX_EDGE = 512;
const LINEAR_REC709 = { encoding: "linear", primaries: "rec709" } as const;

let reading: Reading = WAITING;
const listeners = new Set<() => void>();

function setReading(next: Reading): void {
  reading = next;
  for (const l of listeners) l();
}

export function useReading(): Reading {
  return React.useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    () => reading,
  );
}

function startLive(): () => void {
  let source = livePrefs().source;
  const sampler = startSampler({
    develop: api.stores.useDevelopStore,
    capture: (params) =>
      api.develop.captureFloatFrame(params, { point: "output", space: LINEAR_REC709, maxEdge: MAX_EDGE }),
    paramsFor: (state) => paramsForSource(source, state, api.develop.normalizeParams),
    publish: (m) => setReading(m ? { kind: "measured", measurement: m } : NONE),
  });
  const offSettings = api.settings.onChange((key) => {
    if (key !== "source") return;
    source = livePrefs().source;
    sampler.refresh();
  });
  return () => {
    offSettings();
    sampler.stop();
    setReading(WAITING);
  };
}

/** retain() starts `start` when the first holder arrives; the release each
 *  call returns stops it when the last one leaves. A release is idempotent. */
export function createRetainer(start: () => () => void): () => () => void {
  let holders = 0;
  let stop: (() => void) | null = null;
  return () => {
    if (holders++ === 0) stop = start();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--holders === 0) {
        stop?.();
        stop = null;
      }
    };
  };
}

export const retainSampler = createRetainer(startLive);
