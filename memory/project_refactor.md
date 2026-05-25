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
1. ✅ DONE (commit f28f692, 2026-05-25). Scaffolding + build system. Added `electron.vite.config.js`, `tsconfig*.json`, updated `package.json` deps/scripts, ported `main.js` → `src/main/index.js`, created `src/preload/index.js`, moved `app/` → `src/renderer/`. `npm run dev` launches the unchanged app. Key gotcha for future phases: added a small dev-mode `_localRequire` shim in `src/renderer/frontend.js` because Vite serves the renderer over `http://` (no file-path context for `require()`); shim becomes irrelevant once requires are converted to ES imports in Phase 2.
2. State & data extraction. Convert `lib/*.js` global-`const` files to ES module exports. Set up Pinia stores mirroring gen1 (`useSettingsStore`, `useGameSpeciesData`, `useEmulatorStatsStore`, etc.) and stop reading from the `MyStorage`/`styleSettingsManager` Proxy directly.
3. Component split. Carve `frontend.js` and `index.html` into `.vue` SFCs: `game_area.vue`, `left_panel.vue` (+children), `right_panel.vue` (+children), `graphics.vue`, settings panes. One section at a time, verify between each.
4. Cleanup. Convert key logic to TypeScript, delete legacy `app/`, finalize `package.json` build config.

See [[reference-project-structures]] for the source-of-truth gen1 layout and the gen5 starting structure.

## Phase 2 starting guide (for next session)

**Suggested order to attack Phase 2:**

1. **Wire Vue/Pinia as ES module imports** (smallest risky change first). Change `<script src="frontend.js">` in `src/renderer/index.html` to a module entry, and at top of `frontend.js` add `import { createApp } from 'vue/dist/vue.esm-bundler.js'` + `import { createPinia } from 'pinia'`. Replace `Vue.createApp({...})` with `createApp(...)`, add `.use(pinia)`, keep `.mount('#app')`. This lets you drop `<script src="packages/vue.js">` and signalR/gameHookMapperClient become ES imports too. Verify the app still launches.

2. **Convert the 4 frontend.js dev-shim requires to ES imports** so `_localRequire` can be deleted: `lib/style_settings_manager`, `logic/Timer`, `components/Timer`, `components/ShuckieTimer`. Each needs `module.exports = X` → `export default X` plus their own internal requires (`logic/PubSub`, `lib/default_style_settings`) updated to ES module style. style_settings_manager uses `fs` + `__dirname` — for fs, keep `require('fs')` (works in renderer with nodeIntegration); for `__dirname`, use `import.meta.url` + `new URL(url).pathname` or stash the path via the preload's IPC.

3. **Convert pure-data lib files to ES exports** (the easy bulk). These files just declare a top-level `const X = {...}` and currently rely on `<script src>` to make them globals. Per file: change `const X = {...}` → `export const X = {...}`. Then in `frontend.js` (or wherever they're consumed), add `import { X } from './lib/X.js'`. Files in this category: `lib/textures.js`, `lib/natures.js`, `lib/natureDefinitions.js`, `lib/default_colors.js`, `lib/hiddenpower-all.js`, `lib/hiddenPowerTypes.js`, `lib/stageModifiers.js`, `lib/type-effectiveness.js`, `lib/type effectiveness array.js`, `lib/typeBoostingItems.js`, `lib/autosplitter.js`, `lib/post_game_moves.js`, `lib/g5tmhmMapping.js`, `lib/moves.js`, `lib/moves/{natural_gift,cross_generation_moves,black,unobtainable_moves}.js`, `lib/pokedex/black.js`, `lib/trainers/black.js`, `lib/misc/tmhm.js`, `lib/game_variables.js`, `lib/demo_split_data.js`, `lib/hiddenpower.js`, `lib/auto_save_settings.js`, `references/abilities.js`. Drop the corresponding `<script src>` tags from `src/renderer/index.html` as each is converted. Verify after each batch.

4. **Pinia stores — design first, then implement.** Gen1's stores at `A:\Programs\gen1-stp-frontend\src\renderer\stores\*.ts` are the structural template, but gen5's state shape is different (4 games not 3, evolution logic, RNG modal, Shuckie timer, second-screen mode, etc.). Read `frontend.js`'s `data()` (lines 590-1072) to inventory what state needs storing. Suggested gen5 stores:
   - `useMetaStore` — current game (Black/White/Black 2/White 2), starter, run_finished
   - `useOverlaySettingsStore` — UI toggles, panel choices, colors/saturation
   - `useGameSpeciesData` — per-Pokemon style settings (currently in `MyStorage` Proxy backed by style_settings_manager)
   - `useSpeciesMetricsStore` — attempts/finishes/resets/blackouts counters
   - `useBattleStore` — current battle data
   - `useEmulatorStatsStore` — Shuckie timer/emulator stats polling
   - `useEvolutionStore` — gen5-specific evolution transition state (~12 evolution_* fields in frontend.js data())
   - `useRngStore` — gen5-specific RNG modal state (Route 5 Berry Girl, PWT Shards)
4 actions: design stores by reading gen5 data() vs gen1 stores, implement one at a time, point frontend.js at the store instead of local data/MyStorage.

5. **Replace `MyStorage` Proxy access** in frontend.js gradually as stores come online. The Proxy at frontend.js:4-23 currently routes to styleSettingsManager — replace each `MyStorage["foo"]` lookup with the appropriate store getter. The Proxy itself can be deleted once nothing reads from it.

**Verify after each step:** `npm run dev` should launch, mapper should connect, no new console errors. The user's verification ritual: visual comparison against `dist/win-unpacked/gen5-overlay-app.exe`. Commit at the end of Phase 2.

**Tasks checked in last session** (will need to be recreated in new session — TaskList is per-conversation):
- ☑ #1, #2 Phase 1 (done, commit f28f692)
- ☐ #3 Phase 2 (next up)
- ☐ #4 Phase 3 (carve frontend.js into SFCs)
- ☐ #5 Phase 4 (TS conversion, delete legacy app/ — already gone after Phase 1, so really just final cleanup)
