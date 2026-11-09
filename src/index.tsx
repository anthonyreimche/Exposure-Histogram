// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// The entry point. Safelight imports dist/index.js (built from this file) and
// calls activate() once with the API, scoped to this extension.

import { ExposureHistogramPanel } from "./Panel";
import { resetPrefs } from "./prefs";
import { initRuntime } from "./rt";
import type { SafelightAPI } from "./safelight";

export const PANEL_ID = "exposure-histogram.panel";

/** Just under the Histogram panel (order 1) in Develop's right column. */
const PANEL_ORDER = 1.2;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  host.registerPanel({
    id: PANEL_ID,
    title: "Exposure Histogram",
    component: ExposureHistogramPanel,
    defaultDock: { module: "develop", direction: "right", order: PANEL_ORDER, width: 280 },
    onReset: resetPrefs,
  });
}
