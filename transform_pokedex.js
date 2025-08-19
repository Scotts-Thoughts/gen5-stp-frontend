const fs = require('fs');
const path = require('path');

// Read the pokedex file
const pokedexPath = path.join(__dirname, 'app', 'lib', 'pokedex', 'black.js');
const content = fs.readFileSync(pokedexPath, 'utf8');

// Extract the pokedex object content (remove the const declaration and semicolon)
const objectContent = content.replace(/^const pokedex_black = /, '').replace(/;$/, '');

// Parse the object
const pokedex = eval('(' + objectContent + ')');

// Create new object with species names as keys
const transformedPokedex = {};
for (const [key, value] of Object.entries(pokedex)) {
    const species = value.species;
    if (species && species !== "―――――") { // Skip the placeholder entry
        transformedPokedex[species] = value;
    }
}

// Convert back to JavaScript object format
const transformedContent = 'const pokedex_black = ' + JSON.stringify(transformedPokedex, null, 4) + ';';

// Write the transformed content back to the file
fs.writeFileSync(pokedexPath, transformedContent, 'utf8');

console.log('Successfully transformed pokedex keys from numeric to species names!'); 