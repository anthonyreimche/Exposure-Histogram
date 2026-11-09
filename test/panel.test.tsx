// The panel: an EV histogram over a float capture of the open photo, with
// each channel's share at white and at black and its headroom in a table.

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EV_WHITE } from "../src/ev";
import { activate } from "../src/index";
import { ExposureHistogramPanel } from "../src/Panel";
import { React } from "../src/rt";
import { PARAMS, fakeApi, flatFrame } from "./support/fake-api";

function setup(...args: Parameters<typeof fakeApi>) {
  const rig = fakeApi(...args);
  activate(rig.api);
  return rig;
}

/** Lets the sampler's first capture run and its result render. */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });
}

function row(channel: "Red" | "Green" | "Blue"): string[] {
  const header = screen.getByRole("rowheader", { name: channel });
  const cells = within(header.closest("tr")!).getAllByRole("cell");
  return cells.map((c) => c.textContent ?? "");
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExposureHistogramPanel", () => {
  it("says so while no photo is open", async () => {
    const rig = setup({ photoId: null });
    render(<ExposureHistogramPanel />);
    await flush();
    expect(screen.getByText("No photo open")).toBeTruthy();
    expect(rig.captures).toEqual([]);
  });

  it("captures the edit as linear Rec.709 at the output, with no measurement overlays", async () => {
    const rig = setup();
    rig.setFrame(flatFrame([0.18, 0.18, 0.18]));
    render(<ExposureHistogramPanel />);
    await flush();
    expect(rig.captures).toHaveLength(1);
    expect(rig.captures[0].params).toBe(PARAMS);
    expect(rig.captures[0].options).toMatchObject({
      point: "output",
      space: { encoding: "linear", primaries: "rec709" },
    });
  });

  it("shows each channel's share at white, at black and its headroom", async () => {
    const rig = setup();
    rig.setFrame(flatFrame([1, 0, 0.18]));
    render(<ExposureHistogramPanel />);
    await flush();
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["", "Over", "Under", "Headroom"]);
    expect(row("Red")).toEqual(["100.00 %", "0.00 %", "0.0 EV"]);
    expect(row("Green")).toEqual(["0.00 %", "100.00 %", "12.4 EV"]);
    expect(row("Blue")[0]).toBe("0.00 %");
    expect(row("Blue")[1]).toBe("0.00 %");
    expect(row("Blue")[2]).toBe(`${(EV_WHITE - 0.05).toFixed(1)} EV`);
  });

  it("measures the photo as shot once that source is picked, and remembers the choice", async () => {
    const rig = setup();
    rig.setFrame(flatFrame([0.18, 0.18, 0.18]));
    render(<ExposureHistogramPanel />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "As shot" }));
    await flush();
    await act(async () => new Promise((r) => setTimeout(r, 200)));
    expect(rig.settings.get("source")).toBe("asShot");
    expect(rig.captures.at(-1)?.params).toMatchObject({ exposure: 0, temperature: 5600, tint: 0 });
    expect(screen.getByRole("button", { name: "As shot" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("explains a frame the graphics card can't hand over in floats", async () => {
    const rig = setup();
    rig.setFrame(null);
    render(<ExposureHistogramPanel />);
    await flush();
    expect(screen.getByText(/can't read this frame back in floats/)).toBeTruthy();
  });

  it("captures once for two open copies of the panel, and stops when both close", async () => {
    const rig = setup();
    rig.setFrame(flatFrame([0.18, 0.18, 0.18]));
    const a = render(<ExposureHistogramPanel />);
    const b = render(<ExposureHistogramPanel />);
    await flush();
    expect(rig.captures).toHaveLength(1);
    a.unmount();
    b.unmount();
    act(() => rig.develop.setState({ histogram: { r: new Uint32Array(1), g: new Uint32Array(1), b: new Uint32Array(1), luma: new Uint32Array(1) } }));
    await act(async () => new Promise((r) => setTimeout(r, 200)));
    expect(rig.captures).toHaveLength(1);
  });

  it("switches the layout and the count scale, and remembers both", async () => {
    const rig = setup();
    render(<ExposureHistogramPanel />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Overlay" }));
    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    expect(rig.settings.get("layout")).toBe("overlay");
    expect(rig.settings.get("scale")).toBe("log");
    expect(screen.getByRole("button", { name: "Overlay" }).getAttribute("aria-pressed")).toBe("true");
  });
});
