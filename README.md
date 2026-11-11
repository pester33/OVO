# OvO

Open-source OvO (Construct 2 project) plus a playable **web edition** with custom levels and mobile support.

## Play
The web build is in [`web/`](web/). Serve the repo with any static host (GitHub Pages works — root `index.html` redirects to `web/`).

- All 60 original levels, extracted from `src/Layouts`
- **Custom levels**: built-in editor, save in browser, share by code / link / `.json`
- **Mobile**: on-screen touch controls, fullscreen + landscape, touch-friendly editor

Controls: Arrows/WASD · Up/Space jump · Down = slide / dive / ground pound · R restart · Esc pause

See [`web/README.md`](web/README.md) for details and how to rebuild the level data.

## Construct 2 source
`src/` holds the original project (`OvO.caproj`); all required addons are bundled in `addons/`. It needs a Construct 2 license to open.
