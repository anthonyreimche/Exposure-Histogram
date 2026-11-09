// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// Draws the histogram: a strip per channel (or the three over each other) on
// the EV axis, a line at each whole stop, a brighter one at middle grey, and
// at each end of a strip a bar that lights when that channel clips there.
// Colours come from the core Histogram's theme properties, so a theme that
// restyles one restyles both.

import { CHANNELS, EV_MIN, evTicks, type Channel, type Measurement } from "./ev";
import { heights, peakOf, type Scale } from "./heights";
import type { Layout } from "./prefs";

export const AXIS_HEIGHT = 12;
const STRIP_HEIGHT = 32;
const STRIP_GAP = 3;
const OVERLAY_HEIGHT = 84;
const CLIP_BAR = 3;

export function graphHeight(layout: Layout): number {
  const plot = layout === "stacked" ? 3 * STRIP_HEIGHT + 2 * STRIP_GAP : OVERLAY_HEIGHT;
  return plot + AXIS_HEIGHT;
}

const CHANNEL_RGB: Record<Channel, string> = {
  r: "231,76,60",
  g: "46,204,113",
  b: "74,163,255",
};

const PALETTE_DEFAULTS = {
  grid: "rgba(255,255,255,0.06)",
  label: "rgba(224,224,224,0.85)",
  clipShadow: "rgba(50,77,255,0.9)",
  clipHighlight: "rgba(255,50,50,0.9)",
};

export type Palette = typeof PALETTE_DEFAULTS;

const PALETTE_VARS: Record<keyof Palette, string> = {
  grid: "--histogram-grid",
  label: "--histogram-label",
  clipShadow: "--histogram-clip-shadow",
  clipHighlight: "--histogram-clip-highlight",
};

export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const out = { ...PALETTE_DEFAULTS };
  for (const key of Object.keys(PALETTE_VARS) as (keyof Palette)[]) {
    const v = style.getPropertyValue(PALETTE_VARS[key]).trim();
    if (v) out[key] = v;
  }
  return out;
}

interface Box {
  y: number;
  h: number;
}

function fillChannel(ctx: CanvasRenderingContext2D, w: number, box: Box, h: Float32Array, colour: string): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, box.y + box.h);
  for (let i = 0; i < h.length; i++) {
    ctx.lineTo((i / (h.length - 1)) * w, box.y + box.h - h[i] * (box.h - 1));
  }
  ctx.lineTo(w, box.y + box.h);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, plotH: number, palette: Palette): void {
  for (const { ev, at } of evTicks()) {
    if (ev === EV_MIN) continue;
    const x = Math.round(at * w) + 0.5;
    ctx.strokeStyle = ev === 0 ? palette.label : palette.grid;
    ctx.globalAlpha = ev === 0 ? 0.3 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, plotH);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawAxis(ctx: CanvasRenderingContext2D, w: number, plotH: number, palette: Palette): void {
  ctx.fillStyle = palette.label;
  ctx.font = "8px system-ui, sans-serif";
  ctx.textBaseline = "top";
  for (const { ev, at } of evTicks()) {
    if (ev % 2 !== 0) continue;
    ctx.textAlign = ev === EV_MIN ? "left" : "center";
    ctx.fillText(ev > 0 ? `+${ev}` : `${ev}`, at * w, plotH + 2);
  }
  ctx.textAlign = "right";
  ctx.fillText("EV", w, plotH + 2);
}

function drawClipBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  box: Box,
  under: boolean,
  over: boolean,
  palette: Palette,
): void {
  if (under) {
    ctx.fillStyle = palette.clipShadow;
    ctx.fillRect(0, box.y, CLIP_BAR, box.h);
  }
  if (over) {
    ctx.fillStyle = palette.clipHighlight;
    ctx.fillRect(w - CLIP_BAR, box.y, CLIP_BAR, box.h);
  }
}

export function drawGraph(
  ctx: CanvasRenderingContext2D,
  w: number,
  measurement: Measurement | null,
  layout: Layout,
  scale: Scale,
  palette: Palette,
): void {
  const plotH = graphHeight(layout) - AXIS_HEIGHT;
  ctx.clearRect(0, 0, w, plotH + AXIS_HEIGHT);
  ctx.lineWidth = 1;
  drawGrid(ctx, w, plotH, palette);
  drawAxis(ctx, w, plotH, palette);
  if (!measurement) return;

  if (layout === "stacked") {
    CHANNELS.forEach((ch, i) => {
      const box = { y: i * (STRIP_HEIGHT + STRIP_GAP), h: STRIP_HEIGHT };
      const stats = measurement[ch];
      fillChannel(ctx, w, box, heights(stats.bins, peakOf(stats.bins), scale), `rgba(${CHANNEL_RGB[ch]},0.85)`);
      drawClipBars(ctx, w, box, stats.under > 0, stats.over > 0, palette);
    });
    return;
  }

  const box = { y: 0, h: plotH };
  const peak = Math.max(...CHANNELS.map((ch) => peakOf(measurement[ch].bins)));
  ctx.globalCompositeOperation = "lighter";
  for (const ch of CHANNELS) {
    fillChannel(ctx, w, box, heights(measurement[ch].bins, peak, scale), `rgba(${CHANNEL_RGB[ch]},0.7)`);
  }
  ctx.globalCompositeOperation = "source-over";
  const any = (key: "under" | "over") => CHANNELS.some((ch) => measurement[ch][key] > 0);
  drawClipBars(ctx, w, box, any("under"), any("over"), palette);
}

