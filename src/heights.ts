// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// Bin heights for drawing, 0 to 1. The end bins collect everything at black
// and at white, so they're left out of the peak: a clipped sky would
// otherwise flatten the rest of the histogram.

export type Scale = "linear" | "log";

export function peakOf(bins: Uint32Array): number {
  let peak = 1;
  for (let i = 1; i < bins.length - 1; i++) if (bins[i] > peak) peak = bins[i];
  return peak;
}

export function heights(bins: Uint32Array, peak: number, scale: Scale): Float32Array {
  const out = new Float32Array(bins.length);
  const logPeak = Math.log1p(peak);
  for (let i = 0; i < bins.length; i++) {
    const h = scale === "log" ? Math.log1p(bins[i]) / logPeak : bins[i] / peak;
    out[i] = Math.min(1, h);
  }
  return out;
}
