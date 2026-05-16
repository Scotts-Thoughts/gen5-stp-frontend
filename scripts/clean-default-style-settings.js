// One-shot cleanup: filter every entry in default_style_settings.js to the
// style-property allowlist, stripping leaked run/state data (split_data,
// attempt_number, playerResets, etc.). Writes the file back in place.
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'app', 'lib', 'default_style_settings.js');
const defaults = require(settingsPath);

const stylePropertyKeys = [
    'overlay_color',
    'ui_saturation',
    'imageXOffset',
    'imageYOffset',
    'imageScale',
    'imageFlip',
    'imageSat',
    'imageRotation',
    'backgroundTexture',
    'backgroundBlur',
    'backgroundHue',
    'backgroundScale',
    'backgroundUrl',
    'backgroundFlip',
    'use_custom_background',
    'backgroundXOffset',
    'backgroundYOffset',
    'backgroundBrightness',
    'backgroundContrast',
    'backgroundSaturation',
    'pkmnNature',
    'pkmn_ability',
    'pkmn_gender',
    'hidden_power_type',
    'hidden_power_index',
    'frame',
    'evolution',
    'selected_evolution_species',
    'evolution_splits_label'
];
const allowed = new Set(stylePropertyKeys);

const cleaned = {};
let droppedFieldCount = 0;
const droppedFieldHistogram = {};

for (const key of Object.keys(defaults)) {
    const entry = defaults[key];
    if (!entry || typeof entry !== 'object') continue;
    const filtered = {};
    for (const prop of Object.keys(entry)) {
        if (allowed.has(prop)) {
            filtered[prop] = entry[prop];
        } else {
            droppedFieldCount++;
            droppedFieldHistogram[prop] = (droppedFieldHistogram[prop] || 0) + 1;
        }
    }
    if (Object.keys(filtered).length > 0) {
        cleaned[key] = filtered;
    }
}

const content = `/**
 * Default Style Settings
 *
 * This file contains the default Pokemon art and background texture settings
 * for each game-species pairing. These settings ship with the app and provide
 * aesthetically pleasing defaults out of the box.
 *
 * In DEVELOPMENT mode (npm run dev):
 *   - Style changes are saved to this file automatically
 *   - This allows developers to curate and refine default settings
 *
 * In PRODUCTION mode (built app):
 *   - These defaults are loaded first
 *   - User overrides are stored in localStorage and take precedence
 *   - Users can reset to defaults by clearing their local overrides
 *
 * AUTO-GENERATED - DO NOT EDIT MANUALLY (unless you know what you're doing)
 * Last updated: ${new Date().toISOString()}
 */

const DEFAULT_STYLE_SETTINGS = ${JSON.stringify(cleaned, null, 4)};

// Export for use in the application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_STYLE_SETTINGS;
}
`;

fs.writeFileSync(settingsPath, content, 'utf8');

const beforeBytes = fs.statSync(settingsPath + '.backup').size;
const afterBytes = fs.statSync(settingsPath).size;
console.log(`entries: ${Object.keys(defaults).length} -> ${Object.keys(cleaned).length}`);
console.log(`size:    ${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ${(afterBytes / 1024).toFixed(1)} KB`);
console.log(`dropped fields total: ${droppedFieldCount}`);
console.log('dropped field histogram:');
for (const [k, v] of Object.entries(droppedFieldHistogram).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
}
