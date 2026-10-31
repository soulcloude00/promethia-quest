# Promethia Quest: Relight the Great Torch

A short 3D block-world adventure (8 levels, about 15–20 min) used by Promethia to find curious, persistent problem-solvers in Grades 5–8.

- `index.html` is the game. Add `?test=1` to mark submissions as TEST (also turns on debug key `N` = finish level).
- `scout.html` lists attempts saved on this PC and exports a CSV (PIN protected; PIN hash set in `config.js`).
- `config.js` holds the submit endpoint, scout PIN hash, and hint/skip timings.
- Results are emailed through FormSubmit and also kept in this browser's localStorage (`pq_archive`).

Original code and art. three.js (MIT) is bundled in `assets/`.
