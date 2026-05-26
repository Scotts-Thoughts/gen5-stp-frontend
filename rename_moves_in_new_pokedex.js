// One-off: rewrite move names in the new BW / B2W2 pokedex files
// so they match the legacy keys used in app/lib/moves/black.js.
//
// Usage:
//   node rename_moves_in_new_pokedex.js          (dry run - prints diff)
//   node rename_moves_in_new_pokedex.js --apply  (writes files)

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');

const ROOT = __dirname;
const MOVES_FILE = path.join(ROOT, 'app', 'lib', 'moves', 'black.js');
const DEXES = [
    [path.join(ROOT, 'app', 'lib', 'pokedex', 'black_white.js'),  'pokedex_black_white'],
    [path.join(ROOT, 'app', 'lib', 'pokedex', 'black2_white2.js'), 'pokedex_black2_white2'],
];

// Hand-rolled aliases for moves whose names diverge by more than spacing.
// pokedex_name -> legacy_name (canonical key in black_moves)
const MANUAL_ALIASES = {
    "Feint Attack":   "Faint Attack",
    "Vise Grip":      "ViceGrip",
    "High Jump Kick": "Hi Jump Kick",
    "Smelling Salts": "SmellingSalt",
};

function loadGlobal(filepath, varName) {
    const code = fs.readFileSync(filepath, 'utf8');
    const fn = new Function(code + `\nreturn ${varName};`);
    return fn();
}

function normalize(s) {
    return s.toLowerCase().replace(/[\s\-_'\.]/g, '');
}

const moves = loadGlobal(MOVES_FILE, 'black_moves');
const legacyKeys = Object.keys(moves);
const legacyByNorm = {};
for (const k of legacyKeys) legacyByNorm[normalize(k)] = k;

const mapping = {};        // pokedexName -> legacyName
const unmatched = new Set();

function consider(move) {
    if (typeof move !== 'string') return;
    if (mapping[move] !== undefined) return;
    if (moves[move]) { mapping[move] = move; return; }            // exact hit
    if (MANUAL_ALIASES[move]) {
        if (!moves[MANUAL_ALIASES[move]]) {
            console.warn(`alias target "${MANUAL_ALIASES[move]}" not in black_moves`);
        }
        mapping[move] = MANUAL_ALIASES[move];
        return;
    }
    const legacy = legacyByNorm[normalize(move)];
    if (legacy) { mapping[move] = legacy; return; }
    unmatched.add(move);
}

for (const [filepath, varName] of DEXES) {
    const dex = loadGlobal(filepath, varName);
    for (const species of Object.keys(dex)) {
        const p = dex[species];
        for (const item of p.level_up_learnset || []) consider(item[1]);
        for (const item of p.tm_hm_learnset || [])   consider(item);
        for (const item of p.tutor_learnset || [])   consider(item);
        for (const item of p.egg_moves || [])        consider(item);
    }
}

const renames = Object.entries(mapping).filter(([k, v]) => k !== v);
renames.sort((a, b) => b[0].length - a[0].length);

console.log(`Renames to apply (${renames.length}):`);
for (const [from, to] of renames) console.log(`  "${from}"  ->  "${to}"`);

console.log(`\nUnmatched move names (${unmatched.size}) — no legacy key found:`);
for (const m of [...unmatched].sort()) console.log(`  "${m}"`);

if (!APPLY) {
    console.log('\n(dry run — pass --apply to write files)');
    process.exit(unmatched.size > 0 ? 2 : 0);
}

if (unmatched.size > 0) {
    console.error('\nRefusing to apply: there are unmatched moves. Add them to MANUAL_ALIASES first.');
    process.exit(2);
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

for (const [filepath, varName] of DEXES) {
    let content = fs.readFileSync(filepath, 'utf8');
    let totalChanges = 0;
    for (const [from, to] of renames) {
        const re = new RegExp(`"${escapeRegex(from)}"`, 'g');
        const matches = content.match(re);
        if (!matches) continue;
        content = content.replace(re, `"${to}"`);
        totalChanges += matches.length;
    }
    fs.writeFileSync(filepath, content);
    console.log(`Wrote ${filepath} (${totalChanges} replacements)`);
}
