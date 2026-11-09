// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// The panel's choices, kept in the extension's settings store for every photo.
// A stored value is checked on every read: anything that isn't one of the
// choices falls back to its default.

import type { Scale } from "./heights";
import { React, api } from "./rt";
import type { Source } from "./source";

export type Layout = "stacked" | "overlay";

export interface Prefs {
  source: Source;
  layout: Layout;
  scale: Scale;
}

export const DEFAULT_PREFS: Readonly<Prefs> = { source: "edited", layout: "stacked", scale: "linear" };

const CHOICES: { readonly [K in keyof Prefs]: readonly Prefs[K][] } = {
  source: ["edited", "asShot"],
  layout: ["stacked", "overlay"],
  scale: ["linear", "log"],
};

export type Getter = <T>(key: string, fallback: T) => T;

function pick<K extends keyof Prefs>(key: K, get: Getter): Prefs[K] {
  const value: unknown = get(key, DEFAULT_PREFS[key]);
  const choices: readonly unknown[] = CHOICES[key];
  return choices.includes(value) ? (value as Prefs[K]) : DEFAULT_PREFS[key];
}

export function readPrefs(get: Getter): Prefs {
  return { source: pick("source", get), layout: pick("layout", get), scale: pick("scale", get) };
}

export function livePrefs(): Prefs {
  return readPrefs(api.settings.get);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  api.settings.set(key, value);
}

export function resetPrefs(): void {
  for (const key of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) api.settings.set(key, DEFAULT_PREFS[key]);
}

export function usePrefs(): Prefs {
  const [prefs, setPrefs] = React.useState(livePrefs);
  React.useEffect(() => api.settings.onChange(() => setPrefs(livePrefs())), []);
  return prefs;
}
