# Exposure Histogram for Safelight

A Develop panel that reads exposure in stops: the red, green and blue
histograms on an EV scale, and how close each channel is to clipping.

- **EV scale:** 0 EV is middle grey (18 %). The axis runs from 10 stops below
  it on the left to white on the right, about 2.5 stops above it, with a line
  at every stop.
- **Clipping per channel:** a red bar at the right end of a channel's strip
  means some of its pixels are at white; a blue bar at the left end, at black.
  The table gives each channel's share at white (**Over**) and at black
  (**Under**), using the same limits as an 8-bit display: a channel is over
  where it would show as 255 and under where it would show as 0.
- **Headroom:** how many stops each channel's brightest pixels sit below
  white, to about 0.05 EV. The brightest 0.1 % are left out, so a few
  specular highlights don't use it up.
- **Edited or As shot:** measure the photo as Develop shows it, or the camera's
  own exposure and white balance under Safelight's default rendering, with
  the crop kept. Extension tools that are on, such as lens correction, apply
  to both.
- **Stacked or Overlay**, **Linear or Log** heights. Log shows the sparse
  tones in deep shadow and near white that a linear scale flattens.

The choices are remembered across photos. The panel opens under the
Histogram in Develop's right column, and as a floating window like any panel.
It measures only while it is open.

### What it measures

The histogram measures the rendered photo in linear light, at about 512 px on
its long edge, after each change settles. It doesn't read the sensor's raw
values: by the time an extension can see the photo, the RAW has been
demosaiced and its clipped highlights rebuilt. So **Over** means the channel
is at white in the rendering, not that the sensor itself saturated.

It needs a graphics card that can read frames back in floats. On one that
can't, the panel says so.

## Development

```bash
npm install
npm run typecheck
npm run build    # dist/index.js, the file Safelight loads
npm test         # vitest; the bundle checks read dist/, so build first
npm run check    # all three, in that order
```

Safelight hands the extension its own React through `api.react`, so the
bundle never includes React. `src/safelight.d.ts` is Safelight's generated
extension API; `npm run update-types` refreshes it.

## Licence

GPL-3.0-or-later; see LICENSE. Copyright (C) 2026 Anthony Reimche.
