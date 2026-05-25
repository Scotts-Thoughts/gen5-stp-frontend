---
name: reference-project-structures
description: Authoritative layouts for gen1 (refactor target) and gen5 (refactor source), and gotchas about how gen5 currently wires modules
metadata:
  type: reference
---

**Gen1 target — `A:\Programs\gen1-stp-frontend`:**
- `electron.vite.config.js` (Vue plugin, `~` alias → `src/renderer`)
- `tsconfig.json` (composite, references node + web tsconfigs)
- `tsconfig.web.json` (extends `@electron-toolkit/tsconfig/tsconfig.web.json`, `allowJs: true`, `~/*` paths)
- `tsconfig.node.json` (for main + preload)
- `src/main/index.js` (Electron main process, uses `@electron-toolkit/utils`)
- `src/preload/index.js` (contextBridge exposes `electron`, `api`)
- `src/renderer/index.html` (single `<script type="module" src="/main.ts">`)
- `src/renderer/main.ts` (Pinia + createApp + mount)
- `src/renderer/components/*.vue` (SFCs, organised by `left_panel/`, `right_panel/`, `settings/`)
- `src/renderer/stores/*.ts` (Pinia stores)
- `src/renderer/data/*.{js,ts}` (pokedex, trainers, moves, autosplitter)
- `src/renderer/logic/*.{js,ts}` (Storage, PubSub, Timer, PokeData)
- `src/renderer/methods/*.js`, `packages/*.ts`, `public/images/`, `fonts/`

**Gen5 source — `A:\Programs\gen5-stp-frontend` (after Phase 1 — commit f28f692):**
- `src/main/index.js` (electron-vite-aware Electron main; opens DevTools detached in dev so the auto-scaling viewport stays full-size; uses `process.env.ELECTRON_RENDERER_URL` to load Vite dev URL, falls back to `out/renderer/index.html` in prod)
- `src/preload/index.js` (contextBridge exposes `electron`, `api.settings_dir`, `api.set_game_icon`)
- `src/renderer/index.html` (1,049 lines, still loads ~20 `<script src="lib/*.js">` then `frontend.js` — unchanged from pre-refactor except one missing-whitespace fix at line ~99)
- `src/renderer/frontend.js` (9,664+ lines, one `Vue.createApp({...})` — has a small dev-mode `_localRequire` shim at top, plus 4 callers of it: lib/style_settings_manager, logic/Timer, components/Timer, components/ShuckieTimer)
- `src/renderer/lib/*.js` (each file declares `const foo = {...}` at top level — becomes a window global because index.html script tags load it raw)
- `src/renderer/components/{Timer,ShuckieTimer}.js` (CommonJS `module.exports`, expect `Vue` global)
- `src/renderer/logic/{PubSub,Timer}.js` (CommonJS `module.exports`)
- `src/renderer/methods/`, `src/renderer/packages/`, `src/renderer/references/`, `src/renderer/fonts/`
- `src/renderer/public/images/` (images served by Vite at `/images/...` root URL)
- `src/renderer/{env,index}.d.ts` (Vite + Electron types)
- Root: `electron.vite.config.js`, `tsconfig.{json,web,node}.json`, `package.json` (main → `./out/main/index.js`)

**Critical gotcha:** Gen5's `lib/*.js` files (default_colors, textures, natures, etc.) don't export anything. They rely on `<script src>` tags loading them so their top-level `const` declarations become window globals. Converting these to ES modules requires either adding `export` and updating every consumer with `import`, or temporarily putting them in `src/renderer/public/` so Vite serves them as-is.

**Phase 1 gotchas worth remembering:**
- HTML must have whitespace between attributes — Vite's parse5 rejects `style="..."class="..."` (fixed at line 99 of index.html)
- `require()` from URL-served files can't resolve relative paths — that's why the `_localRequire` shim exists for the 4 local requires in frontend.js (style_settings_manager, logic/Timer, components/Timer, components/ShuckieTimer). The other Node built-in requires (`fs`, `path`, `http`, `console`, `stream`, `node-key-sender`) keep working as-is because they don't need file-path resolution.
- DevTools should open in `{ mode: 'detach' }` in dev because the docked panel shrinks the viewport, and the renderer's inline scaling script (`#app-container { transform: scale(...) }` in `src/renderer/index.html` near line 1022) then shrinks everything to fit the smaller viewport.
- gen5's `keyhook.exe` is referenced at frontend.js:254 via `spawn("keyhook.exe")`. It's `/keyhook.exe`-gitignored — Scott has it locally. ENOENT errors at startup are harmless if it's not present.
- The dist build at `dist/win-unpacked/resources/app.asar` is the pre-refactor reference if a visual regression is suspected — Phase 1 verified the served CSS/HTML byte-match the asar contents (aside from the line-99 space fix).

**Gen5-only features to preserve** (not in gen1):
- Control server on `127.0.0.1:30159` (frontend.js ~9500-9663) — endpoints `/reload`, `/quit`, `/status`, etc.
- Second-screen mode (`second_screen_mode` flag, `main.js` icon swap by game)
- Shuckie timer / ShuckieTimer.js component
- Multi-game support (Black/White/Black 2/White 2 toggle)
- Evolution transition logic (~12 evolution_* data fields)
- RNG modal (Route 5 Berry Girl, PWT Shards)
- `node-key-sender` integration
- Style settings manager (`lib/style_settings_manager.js`) with layered defaults + user overrides
