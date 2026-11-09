// A stand-in Safelight API for unit tests, over real React and zustand. It has
// only what this extension uses: reading any other member throws, naming it,
// so a test shows what to add here when the extension starts using more.
//
// The develop store is a zustand store holding the fields the panel reads.
// captureFloatFrame records each call and answers with the frame the test
// set, and the settings store is a Map that tells its listeners of each write.
// The UI kit's SegmentedControl is a row of buttons, one per option, pressed
// when it is the value.

import * as React from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import type {
  DevelopParams,
  DevelopState,
  FloatFrame,
  LiveFloatCaptureOptions,
  PanelContribution,
  SafelightAPI,
  SegmentedControlProps,
  UITokens,
} from "../../src/safelight";

type DevelopSlice = Pick<DevelopState, "photoId" | "params" | "previewParams" | "histogram" | "asShotTemperature">;
type FakeDevelopStore = UseBoundStore<StoreApi<DevelopSlice>>;

/** The members of SafelightAPI this fake implements, typed against the real thing. */
type FakeMembers = Pick<SafelightAPI, "version" | "extensionId" | "react" | "registerPanel"> & {
  settings: SafelightAPI["settings"];
  ui: Pick<SafelightAPI["ui"], "SegmentedControl" | "tokens">;
  develop: Pick<SafelightAPI["develop"], "captureFloatFrame" | "normalizeParams">;
  stores: { useDevelopStore: FakeDevelopStore };
};


export interface CaptureCall {
  params: DevelopParams;
  options: LiveFloatCaptureOptions | undefined;
}

export interface Rig {
  api: SafelightAPI;
  panels: PanelContribution[];
  develop: FakeDevelopStore;
  captures: CaptureCall[];
  /** What the next captures answer with; null as a core without float targets does. */
  setFrame(frame: FloatFrame | null): void;
  settings: Map<string, unknown>;
}

export const PARAMS = { exposure: 0.7, temperature: 4800, tint: 5 } as DevelopParams;

const TOKENS = {
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  surface0: "var(--color-surface-0)",
  borderSubtle: "var(--color-border-subtle)",
  fontMono: "var(--font-mono)",
} as Partial<UITokens> as UITokens;

export function fakeApi(initial: Partial<DevelopSlice> = {}): Rig {
  const panels: PanelContribution[] = [];
  const captures: CaptureCall[] = [];
  const settings = new Map<string, unknown>();
  const settingListeners = new Set<(key: string, value: unknown) => void>();
  let frame: FloatFrame | null = null;

  const develop = create<DevelopSlice>()(() => ({
    photoId: "p1",
    params: PARAMS,
    previewParams: null,
    histogram: null,
    asShotTemperature: 5600,
    ...initial,
  }));

  function SegmentedControl({ value, onChange, options }: SegmentedControlProps) {
    return React.createElement(
      "div",
      { role: "group" },
      options.map((o) =>
        React.createElement(
          "button",
          { key: o.value, type: "button", "aria-pressed": o.value === value, onClick: () => onChange(o.value) },
          o.label,
        ),
      ),
    );
  }

  const members: FakeMembers = {
    version: 1,
    extensionId: "exposure-histogram",
    react: React,
    registerPanel: (c) => void panels.push(c),
    settings: {
      get: <T,>(key: string, fallback: T): T => (settings.has(key) ? (settings.get(key) as T) : fallback),
      set: (key, value) => {
        settings.set(key, value);
        for (const l of settingListeners) l(key, value);
      },
      onChange: (cb) => {
        settingListeners.add(cb);
        return () => void settingListeners.delete(cb);
      },
    },
    ui: { SegmentedControl, tokens: TOKENS },
    develop: {
      captureFloatFrame: (params, options) => {
        captures.push({ params, options });
        return Promise.resolve(frame);
      },
      normalizeParams: (p) => ({ exposure: 0, temperature: 6500, tint: 0, ...p }) as DevelopParams,
    },
    stores: { useDevelopStore: develop },
  };

  return {
    // The fake implements a typed subset; the strict proxy turns any other
    // member's read into a test failure that names it.
    api: strict(members, "api") as unknown as SafelightAPI,
    panels,
    develop,
    captures,
    setFrame: (f) => void (frame = f),
    settings,
  };
}

/** A w×h linear frame, every pixel the same [r, g, b]. */
export function flatFrame(rgb: [number, number, number], w = 10, h = 10): FloatFrame {
  const data = new Float32Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 1], i);
  return { data, width: w, height: h, space: { encoding: "linear", primaries: "rec709" }, point: "output" };
}

/** Wraps a plain object so reading a member it lacks throws, naming the member. */
function strict<T extends object>(target: T, path: string): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      if (typeof key === "symbol" || key === "then" || key === "toJSON") return Reflect.get(obj, key, receiver);
      if (!(key in obj)) throw new Error(`The fake API has no ${path}.${key}. Add it to test/support/fake-api.ts.`);
      const value: unknown = Reflect.get(obj, key, receiver);
      const isPlainObject = typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
      return isPlainObject && key !== "react" ? strict(value, `${path}.${key}`) : value;
    },
  });
}
