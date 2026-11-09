// Exposure Histogram — a Safelight extension.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 or later;
// see LICENSE.

// What the histogram measures: the edit as the view draws it, or the photo as
// shot. As shot is the default rendering under the camera's white balance,
// with the edit's framing and process version kept so both sources cover the
// same pixels through the same pipeline. Extension stages (lens correction,
// RAW denoise) still run in both: their values live in the photo's param bag,
// which a capture can add to but not clear.

import type { DevelopParams, DevelopState } from "./safelight";

export type Source = "edited" | "asShot";

type Normalize = (p: Partial<DevelopParams> | undefined) => DevelopParams;

export function asShotParams(params: DevelopParams, asShotTemperature: number, normalize: Normalize): DevelopParams {
  return normalize({
    temperature: asShotTemperature,
    tint: 0,
    crop: params.crop,
    straighten: params.straighten,
    transform: params.transform,
    uprightMode: params.uprightMode,
    guidedLines: params.guidedLines,
    processVersion: params.processVersion,
  });
}

export function paramsForSource(
  source: Source,
  state: Pick<DevelopState, "params" | "previewParams" | "asShotTemperature">,
  normalize: Normalize,
): DevelopParams {
  if (source === "asShot") return asShotParams(state.params, state.asShotTemperature, normalize);
  return state.previewParams ?? state.params;
}
