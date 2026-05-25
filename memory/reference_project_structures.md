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

**Gen5 source — `A:\Programs\gen5-stp-frontend`:**
- `main.js` at root (raw Electron, no build step — `"dev": "electron ."`)
- `app/index.html` (1,049 lines, loads ~20 `<script src="lib/*.js">` then `frontend.js`)
- `app/frontend.js` (9,664 lines, one `Vue.createApp({...})` with components/data/created/watch/computed/methods/mounted)
- `app/lib/*.js` (each file declares `const foo = {...}` at top level — becomes a window global because index.html script tags load it raw)
- `app/components/{Timer,ShuckieTimer}.js` (use `require()` and `module.exports`, expect `Vue` global)
- `app/logic/{PubSub,Timer}.js` (CommonJS `module.exports`)
- `app/methods/`, `app/packages/`, `app/references/`, `app/fonts/`, `app/images/`

**Critical gotcha:** Gen5's `lib/*.js` files (default_colors, textures, natures, etc.) don't export anything. They rely on `<script src>` tags loading them so their top-level `const` declarations become window globals. Converting these to ES modules requires either adding `export` and updating every consumer with `import`, or temporarily putting them in `src/renderer/public/` so Vite serves them as-is.

**Gen5-only features to preserve** (not in gen1):
- Control server on `127.0.0.1:30159` (frontend.js ~9500-9663) — endpoints `/reload`, `/quit`, `/status`, etc.
- Second-screen mode (`second_screen_mode` flag, `main.js` icon swap by game)
- Shuckie timer / ShuckieTimer.js component
- Multi-game support (Black/White/Black 2/White 2 toggle)
- Evolution transition logic (~12 evolution_* data fields)
- RNG modal (Route 5 Berry Girl, PWT Shards)
- `node-key-sender` integration
- Style settings manager (`lib/style_settings_manager.js`) with layered defaults + user overrides
