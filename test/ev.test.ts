// The EV scale and what one measurement of a frame reports per channel.

import { describe, expect, it } from "vitest";
import {
  BINS,
  EV_MIN,
  EV_WHITE,
  OVER_LEVEL,
  UNDER_LEVEL,
  binOf,
  evOf,
  evTicks,
  measure,
} from "../src/ev";

const BIN_EV = (EV_WHITE - EV_MIN) / BINS;

/** An RGBA float frame of `pixels`, one [r, g, b] each, alpha 1. */
function frame(pixels: [number, number, number][]): Float32Array {
  const data = new Float32Array(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => data.set([r, g, b, 1], i * 4));
  return data;
}

/** measure(), for a frame the test knows has pixels. */
function measured(data: Float32Array) {
  const m = measure(data);
  if (!m) throw new Error("no measurement");
  return m;
}

function repeat(n: number, rgb: [number, number, number]): [number, number, number][] {
  return Array.from({ length: n }, () => rgb);
}

describe("the EV scale", () => {
  it("puts 0 EV at middle grey and white about 2.5 stops above it", () => {
    expect(evOf(0.18)).toBeCloseTo(0, 10);
    expect(evOf(0.36)).toBeCloseTo(1, 10);
    expect(EV_WHITE).toBeCloseTo(Math.log2(1 / 0.18), 10);
    expect(evOf(1)).toBeCloseTo(EV_WHITE, 10);
  });

  it("spans 10 stops below middle grey up to white", () => {
    expect(EV_MIN).toBe(-10);
    expect(BINS).toBe(256);
  });

  it("bins white and anything brighter into the top bin", () => {
    expect(binOf(1)).toBe(BINS - 1);
    expect(binOf(4)).toBe(BINS - 1);
  });

  it("bins black, negatives and NaN into the bottom bin", () => {
    expect(binOf(0)).toBe(0);
    expect(binOf(-0.2)).toBe(0);
    expect(binOf(Number.NaN)).toBe(0);
    expect(binOf(0.18 * 2 ** -12)).toBe(0);
  });

  it("bins middle grey 10 stops in from the left edge", () => {
    expect(binOf(0.18)).toBe(Math.floor((10 / (EV_WHITE - EV_MIN)) * BINS));
  });

  it("calls a channel over at an 8-bit display's top code and under at its bottom code", () => {
    const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    expect(OVER_LEVEL).toBeCloseTo(decode(254.5 / 255), 10);
    expect(UNDER_LEVEL).toBeCloseTo(decode(0.5 / 255), 10);
  });

  it("ticks every whole stop from the left edge to +2, placed across the axis", () => {
    const ticks = evTicks();
    expect(ticks.map((t) => t.ev)).toEqual([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2]);
    expect(ticks[0].at).toBe(0);
    expect(ticks.find((t) => t.ev === 0)?.at).toBeCloseTo(10 / (EV_WHITE - EV_MIN), 10);
  });
});

describe("measure", () => {
  it("counts every pixel once per channel, ignoring alpha", () => {
    const data = frame([
      [0.18, 0.5, 0.01],
      [0.18, 0.5, 0.01],
    ]);
    data[3] = 0;
    const m = measured(data);
    expect(m.pixels).toBe(2);
    for (const ch of ["r", "g", "b"] as const) {
      expect(m[ch].bins.length).toBe(BINS);
      expect(m[ch].bins.reduce((a, b) => a + b, 0)).toBe(2);
    }
    expect(m.r.bins[binOf(0.18)]).toBe(2);
    expect(m.g.bins[binOf(0.5)]).toBe(2);
    expect(m.b.bins[binOf(0.01)]).toBe(2);
  });

  it("reports the share of pixels each channel has at white", () => {
    const m = measured(frame([[1, 0.5, 0.5], [OVER_LEVEL, 1, 0.5], [0.9, 0.5, 0.5], [0.5, 0.5, 0.5]]));
    expect(m.r.over).toBe(0.5);
    expect(m.g.over).toBe(0.25);
    expect(m.b.over).toBe(0);
  });

  it("reports the share of pixels each channel has at black", () => {
    const m = measured(frame([[0, 0.5, 0.0002], [UNDER_LEVEL * 0.99, 0.5, UNDER_LEVEL], [-0.1, 0.5, 0.5], [0.5, 0, 0.5]]));
    expect(m.r.under).toBe(0.75);
    expect(m.g.under).toBe(0.25);
    expect(m.b.under).toBe(0);
  });

  it("gives an evenly grey frame about 2.5 stops of headroom", () => {
    const m = measured(frame(repeat(100, [0.18, 0.18, 0.18])));
    expect(m.g.headroom).toBeGreaterThanOrEqual(EV_WHITE - BIN_EV);
    expect(m.g.headroom).toBeLessThanOrEqual(EV_WHITE);
  });

  it("measures headroom from each channel's own brightest pixels", () => {
    const m = measured(frame(repeat(100, [0.72, 0.36, 0.18])));
    expect(m.r.headroom).toBeCloseTo(EV_WHITE - 2, 1);
    expect(m.g.headroom).toBeCloseTo(EV_WHITE - 1, 1);
    expect(m.b.headroom).toBeCloseTo(EV_WHITE, 1);
  });

  it("lets the brightest 0.1 % of a channel clip without using up its headroom", () => {
    const m = measured(frame([...repeat(999, [0.18, 0.18, 0.18]), [1, 1, 1]]));
    expect(m.r.headroom).toBeGreaterThan(EV_WHITE - BIN_EV);
  });

  it("has no headroom once more than 0.1 % of a channel is at white", () => {
    const m = measured(frame([...repeat(998, [0.18, 0.18, 0.18]), [1, 0.18, 0.18], [1, 0.18, 0.18]]));
    expect(m.r.headroom).toBe(0);
    expect(m.g.headroom).toBeGreaterThan(2);
  });

  it("returns null for a frame without pixels", () => {
    expect(measure(new Float32Array(0))).toBeNull();
  });
});
