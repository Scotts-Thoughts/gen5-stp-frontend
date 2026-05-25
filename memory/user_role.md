---
name: user-role
description: Scott — owner of stp-frontend projects, runs Pokemon speedrun overlay, prefers phase-by-phase progress with commits at boundaries
metadata:
  type: user
---

Scott (`scottsthoughtspokemon@gmail.com`) owns `gen1-stp-frontend` and `gen5-stp-frontend` — Electron overlays for Pokemon speedruns that show splits, stats, and battle data driven by PokeAByte memory mappers.

Already refactored gen1 from a similar monolithic structure into electron-vite + Vue 3 SFCs + Pinia + TypeScript. Asking to repeat the same refactor on gen5. Aware of the scope, chose "full refactor, all phases" + "commit at each phase boundary" + "preserve all current behavior (including gen5-only features)" when offered options.

**How to apply:** Don't propose simplifications that drop gen5 features (queuer endpoints, second-screen mode, Shuckie timer, multi-game toggle, evolution logic, RNG modal). Use gen1 as the canonical structural reference but extend it where gen5 needs more. Commit at each phase boundary as a deliberate checkpoint.
