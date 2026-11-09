// What activate() registers: the panel in Develop's right column, named under
// the manifest's id.

import { describe, expect, it } from "vitest";
import manifest from "../safelight.json";
import { PANEL_ID, activate } from "../src/index";
import { ExposureHistogramPanel } from "../src/Panel";
import { fakeApi } from "./support/fake-api";

describe("activate", () => {
  it("registers the Exposure Histogram panel in Develop, under the core Histogram", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.panels).toEqual([
      {
        id: PANEL_ID,
        title: "Exposure Histogram",
        component: ExposureHistogramPanel,
        defaultDock: { module: "develop", direction: "right", order: 1.2, width: 280 },
        onReset: expect.any(Function),
      },
    ]);
  });

  it("names the panel under the manifest's id", () => {
    expect(PANEL_ID).toBe(`${manifest.id}.panel`);
  });
});
