// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// The EV scale and one measurement of a linear frame. The axis is in stops
// from middle grey (0 EV = 18 %), so white sits about 2.5 stops above 0 and
// the left edge 10 stops below. "Over" and "under" use an 8-bit display's
// codes: a channel is over where it would show as 255 and under where it would
// show as 0.

export const MID_GREY = 0.18;
export const EV_MIN = -10;
export const EV_WHITE = Math.log2(1 / MID_GREY);
export const BINS = 256;

const SPAN = EV_WHITE - EV_MIN;
const BIN_EV = SPAN / BINS;

function srgbDecode(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export const OVER_LEVEL = srgbDecode(254.5 / 255);
export const UNDER_LEVEL = srgbDecode(0.5 / 255);

/** The share of a channel's pixels allowed at white before its headroom is
 *  0: a few specular points shouldn't read as a clipped exposure. */
const HEADROOM_TOLERANCE = 0.001;

export const CHANNELS = ["r", "g", "b"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ChannelStats {
  bins: Uint32Array;
  /** Share of pixels at white, 0 to 1. */
  over: number;
  /** Share of pixels at black, 0 to 1. */
  under: number;
  /** Stops from the channel's brightest pixels (all but the top 0.1 %) up to
   *  white, to the bin. */
  headroom: number;
}

export type Measurement = Record<Channel, ChannelStats> & { pixels: number };

export function evOf(linear: number): number {
  return Math.log2(linear / MID_GREY);
}

export function binOf(linear: number): number {
  if (!(linear > 0)) return 0;
  const bin = Math.floor(((evOf(linear) - EV_MIN) / SPAN) * BINS);
  return Math.min(BINS - 1, Math.max(0, bin));
}

/** Whole stops from the left edge to +2, each with its place across the
 *  axis from 0 to 1. */
export function evTicks(): { ev: number; at: number }[] {
  const ticks: { ev: number; at: number }[] = [];
  for (let ev = EV_MIN; ev < EV_WHITE; ev++) ticks.push({ ev, at: (ev - EV_MIN) / SPAN });
  return ticks;
}

function headroomOf(bins: Uint32Array, pixels: number): number {
  const allowed = pixels * HEADROOM_TOLERANCE;
  let above = 0;
  for (let i = BINS - 1; i >= 0; i--) {
    above += bins[i];
    if (above > allowed) return (BINS - 1 - i) * BIN_EV;
  }
  return SPAN;
}

/** Bins an RGBA float frame (linear, alpha ignored) per channel. Null for a
 *  frame without pixels. */
export function measure(data: Float32Array): Measurement | null {
  const pixels = Math.floor(data.length / 4);
  if (pixels === 0) return null;
  const bins = CHANNELS.map(() => new Uint32Array(BINS));
  const over = [0, 0, 0];
  const under = [0, 0, 0];
  for (let i = 0; i < pixels * 4; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      bins[c][binOf(v)]++;
      if (v >= OVER_LEVEL) over[c]++;
      else if (!(v >= UNDER_LEVEL)) under[c]++;
    }
  }
  const stats = (c: number): ChannelStats => ({
    bins: bins[c],
    over: over[c] / pixels,
    under: under[c] / pixels,
    headroom: headroomOf(bins[c], pixels),
  });
  return { r: stats(0), g: stats(1), b: stats(2), pixels };
}
