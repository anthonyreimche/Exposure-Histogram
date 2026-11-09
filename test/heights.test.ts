// How tall each bin draws: against the tallest bin between the clipped ends,
// on a linear or a log count scale.

import { describe, expect, it } from "vitest";
import { heights, peakOf } from "../src/heights";

describe("peakOf", () => {
  it("is the tallest bin, leaving out the clipped bins at either end", () => {
    const bins = new Uint32Array([900, 3, 7, 2, 500]);
    expect(peakOf(bins)).toBe(7);
  });

  it("is at least 1, so an empty histogram draws flat", () => {
    expect(peakOf(new Uint32Array(8))).toBe(1);
  });
});

describe("heights", () => {
  it("scales linearly to the peak and caps the clipped spikes at full height", () => {
    const h = heights(new Uint32Array([40, 5, 10, 0, 40]), 10, "linear");
    expect(Array.from(h)).toEqual([1, 0.5, 1, 0, 1]);
  });

  it("scales by the log of the count on the log scale", () => {
    const h = heights(new Uint32Array([0, 1, 9, 99]), 99, "log");
    expect(h[0]).toBe(0);
    expect(h[1]).toBeCloseTo(Math.log(2) / Math.log(100), 6);
    expect(h[2]).toBeCloseTo(0.5, 6);
    expect(h[3]).toBeCloseTo(1, 6);
  });
});
