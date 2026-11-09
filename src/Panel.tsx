// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// The panel: the EV histogram, a table of each channel's share at white and
// at black with its headroom, and the source, layout and scale choices. It
// docks in Develop and opens as a floating window like any panel; every open
// copy shares one sampler.

import { CHANNELS, type Channel, type Measurement } from "./ev";
import { drawGraph, graphHeight, readPalette } from "./draw";
import { retainSampler, useReading } from "./live";
import { setPref, usePrefs, type Layout, type Prefs } from "./prefs";
import { React, api } from "./rt";

const CHANNEL_NAME: Record<Channel, string> = { r: "Red", g: "Green", b: "Blue" };

const CLIP_HIGHLIGHT = "var(--histogram-clip-highlight, rgba(255,50,50,0.9))";
const CLIP_SHADOW = "var(--histogram-clip-shadow, rgba(100,140,255,1))";

function percent(share: number): string {
  return `${(share * 100).toFixed(2)} %`;
}

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = React.useState(256);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function Graph({ measurement, prefs }: { measurement: Measurement | null; prefs: Prefs }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const width = useWidth(wrapRef);
  const height = graphHeight(prefs.layout);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGraph(ctx, width, measurement, prefs.layout, prefs.scale, readPalette());
  }, [measurement, prefs.layout, prefs.scale, width, height]);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <canvas
        ref={canvasRef}
        aria-label="Exposure histogram"
        style={{ display: "block", width, height, borderRadius: 4, background: api.ui.tokens.surface0 }}
      />
    </div>
  );
}

function StatsTable({ measurement }: { measurement: Measurement }) {
  const { tokens } = api.ui;
  const cell: React.CSSProperties = { padding: "1px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const head: React.CSSProperties = { ...cell, fontWeight: 500, color: tokens.textMuted };
  const tint = (share: number, colour: string) => (share > 0 ? colour : tokens.textSecondary);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, color: tokens.textSecondary }}>
      <thead>
        <tr>
          <th style={head} />
          <th style={head} title="Share of the channel's pixels at white">
            Over
          </th>
          <th style={head} title="Share of the channel's pixels at black">
            Under
          </th>
          <th style={head} title="Stops from the channel's brightest pixels up to white">
            Headroom
          </th>
        </tr>
      </thead>
      <tbody>
        {CHANNELS.map((ch) => {
          const s = measurement[ch];
          return (
            <tr key={ch}>
              <th scope="row" style={{ ...head, textAlign: "left" }}>
                {CHANNEL_NAME[ch]}
              </th>
              <td style={{ ...cell, color: tint(s.over, CLIP_HIGHLIGHT) }}>{percent(s.over)}</td>
              <td style={{ ...cell, color: tint(s.under, CLIP_SHADOW) }}>{percent(s.under)}</td>
              <td style={cell}>{`${s.headroom.toFixed(1)} EV`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ExposureHistogramPanel() {
  const { SegmentedControl, tokens } = api.ui;
  const photoId = api.stores.useDevelopStore((s) => s.photoId);
  const prefs = usePrefs();
  const reading = useReading();
  React.useEffect(() => retainSampler(), []);

  const measurement = photoId !== null && reading.kind === "measured" ? reading.measurement : null;
  let status: string | null = null;
  if (photoId === null) status = "No photo open";
  else if (reading.kind === "waiting") status = "Measuring…";
  else if (reading.kind === "none") status = "No measurement: this graphics card can't read this frame back in floats.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px" }}>
      <Graph measurement={measurement} prefs={prefs} />
      {status !== null ? (
        <div style={{ fontSize: 10, color: tokens.textMuted }}>{status}</div>
      ) : (
        measurement && <StatsTable measurement={measurement} />
      )}
      <SegmentedControl
        size="sm"
        value={prefs.source}
        onChange={(v) => setPref("source", v === "asShot" ? "asShot" : "edited")}
        options={[
          { value: "edited", label: "Edited", title: "The photo as the view shows it" },
          { value: "asShot", label: "As shot", title: "The camera's exposure and white balance, before any edit" },
        ]}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <SegmentedControl
            size="sm"
            value={prefs.layout}
            onChange={(v) => setPref("layout", v as Layout)}
            options={[
              { value: "stacked", label: "Stacked" },
              { value: "overlay", label: "Overlay" },
            ]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <SegmentedControl
            size="sm"
            value={prefs.scale}
            onChange={(v) => setPref("scale", v === "log" ? "log" : "linear")}
            options={[
              { value: "linear", label: "Linear", title: "Bar heights by pixel count" },
              { value: "log", label: "Log", title: "Bar heights by the log of the pixel count, so sparse tones show" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
