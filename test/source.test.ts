// What each source measures, and the panel's stored preferences.

import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, readPrefs } from "../src/prefs";
import { asShotParams, paramsForSource } from "../src/source";
import type { DevelopParams } from "../src/safelight";

const EDITED = {
  exposure: 1.5,
  contrast: 30,
  temperature: 4200,
  tint: 12,
  straighten: 2,
  crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5, angle: 0 },
  transform: { vertical: 10 },
  uprightMode: "auto",
  guidedLines: [],
  processVersion: 2,
  displayTransform: "agx",
} as unknown as DevelopParams;

/** normalizeParams' stand-in: the defaults under whatever it is given. */
const normalize = (p: Partial<DevelopParams> | undefined): DevelopParams =>
  ({ exposure: 0, contrast: 0, temperature: 6500, tint: 0, displayTransform: null, ...p }) as DevelopParams;

describe("asShotParams", () => {
  const shot = asShotParams(EDITED, 5100, normalize);

  it("resets the tone and colour edits", () => {
    expect(shot.exposure).toBe(0);
    expect(shot.contrast).toBe(0);
    expect(shot.displayTransform).toBeNull();
  });

  it("uses the camera's white balance", () => {
    expect(shot.temperature).toBe(5100);
    expect(shot.tint).toBe(0);
  });

  it("keeps the framing and the process version, so it measures the same pixels", () => {
    expect(shot.crop).toBe(EDITED.crop);
    expect(shot.straighten).toBe(2);
    expect(shot.transform).toBe(EDITED.transform);
    expect(shot.uprightMode).toBe("auto");
    expect(shot.guidedLines).toBe(EDITED.guidedLines);
    expect(shot.processVersion).toBe(2);
  });
});

describe("paramsForSource", () => {
  const state = { params: EDITED, previewParams: null, asShotTemperature: 5100 };

  it("measures the edit as the view draws it, a preset's hover preview included", () => {
    expect(paramsForSource("edited", state, normalize)).toBe(EDITED);
    const preview = { ...EDITED, exposure: -1 };
    expect(paramsForSource("edited", { ...state, previewParams: preview }, normalize)).toBe(preview);
  });

  it("measures the photo as shot", () => {
    expect(paramsForSource("asShot", state, normalize)).toMatchObject({ exposure: 0, temperature: 5100 });
  });
});

describe("readPrefs", () => {
  it("defaults to the edit, stacked channels and a linear count scale", () => {
    expect(DEFAULT_PREFS).toEqual({ source: "edited", layout: "stacked", scale: "linear" });
    expect(readPrefs((_key, fallback) => fallback)).toEqual(DEFAULT_PREFS);
  });

  it("reads stored choices", () => {
    const stored: Record<string, unknown> = { source: "asShot", layout: "overlay", scale: "log" };
    expect(readPrefs((key, fallback) => (key in stored ? stored[key] : fallback) as typeof fallback)).toEqual(stored);
  });

  it("falls back to the default for anything malformed", () => {
    const stored: Record<string, unknown> = { source: "raw", layout: 3, scale: null };
    expect(readPrefs((key, fallback) => (key in stored ? stored[key] : fallback) as typeof fallback)).toEqual(
      DEFAULT_PREFS,
    );
  });
});
