---
name: project-refactor
description: Goal and phases for refactoring gen5-stp-frontend to mirror gen1-stp-frontend's modern structure
metadata:
  type: project
---

Goal: refactor `A:\Programs\gen5-stp-frontend` to use the same architecture as `A:\Programs\gen1-stp-frontend` — electron-vite + Vue 3 SFC components + Pinia stores + TypeScript configs + `src/{main,preload,renderer}` layout. Started 2026-05-25 on the `refactor` branch (no prior work on the branch).

**Why:** Gen5's `app/frontend.js` is a 9,664-line monolithic Vue component declared via `Vue.createApp({...})` on the global, all wired up by ~20 `<script src="lib/*.js">` tags in `app/index.html` that drop top-level `const` declarations onto `window`. The user already refactored gen1 to a modern structure and wants gen5 to match.

**How to apply:** Work in four phases, commit at each boundary (user's stated preference). Preserve all current gen5 behavior — features that don't exist in gen1 (queuer endpoints, second-screen mode, Shuckie timer, multi-game B/W/B2W2 toggle, evolution logic, RNG modal, control server on 127.0.0.1:30159) must keep working. Verify with `npm run dev` between phases.

**Phases:**
1. Scaffolding + build system. Add `electron.vite.config.js`, `tsconfig*.json`, update `package.json` deps/scripts, port `main.js` → `src/main/index.js`, create `src/preload/index.js`, move `app/` → `src/renderer/`. Goal: existing code still runs unchanged under `npm run dev`.
2. State & data extraction. Convert `lib/*.js` global-`const` files to ES module exports. Set up Pinia stores mirroring gen1 (`useSettingsStore`, `useGameSpeciesData`, `useEmulatorStatsStore`, etc.) and stop reading from the `MyStorage`/`styleSettingsManager` Proxy directly.
3. Component split. Carve `frontend.js` and `index.html` into `.vue` SFCs: `game_area.vue`, `left_panel.vue` (+children), `right_panel.vue` (+children), `graphics.vue`, settings panes. One section at a time, verify between each.
4. Cleanup. Convert key logic to TypeScript, delete legacy `app/`, finalize `package.json` build config.

See [[reference-project-structures]] for the source-of-truth gen1 layout and the gen5 starting structure.
