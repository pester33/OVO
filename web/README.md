# OvO Web (playable HTML5 build)

Open `index.html` through any static web server (e.g. `python3 -m http.server` in this folder, or GitHub Pages / Vercel).

* All 60 original levels, extracted from `src/Layouts/Level N.xml`
* **Custom levels**: Custom levels → + New level opens the editor. Levels save in the browser; Share gives a code / link / .json that anyone can import.
* **Mobile**: on-screen ◀ ▶ ▼ ▲ buttons (auto on touch devices, size adjustable in Options), fullscreen + landscape, touch editor (two-finger pan/pinch).

Controls: Arrows/WASD, Up/Space jump, Down = slide (ground) / dive (air while moving) / ground pound (air standing still), R restart, Esc pause.

Rebuild level data after editing layouts in Construct 2:
    python3 tools/extract.py ../src/Layouts levels_raw.json
    python3 tools/build_levels.py levels_raw.json ../src/Files/levels.json levels.js
