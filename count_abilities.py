#!/usr/bin/env python3
"""
Script to count how many Pokemon in the pokedex have ability arrays with exactly 2 elements.
"""

import re
import json

def count_pokemon_with_two_abilities(file_path):
    """
    Reads the JavaScript pokedex file and counts Pokemon with exactly 2 abilities.
    
    Args:
        file_path: Path to the black.js pokedex file
        
    Returns:
        Tuple of (count, total_pokemon, pokemon_names)
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Method 1: Try to parse as JSON after cleaning
    # Remove the const declaration and semicolon
    json_content = content.replace('const pokedex_black = ', '').rstrip().rstrip(';')
    
    try:
        pokedex = json.loads(json_content)
        count = 0
        pokemon_with_two = []
        pokemon_with_one = []
        total = len(pokedex)
        
        for pokemon_name, pokemon_data in pokedex.items():
            if 'abilities' in pokemon_data:
                abilities = pokemon_data['abilities']
                if isinstance(abilities, list):
                    # Only count Pokemon with exactly 2 abilities (exclude 1-element arrays)
                    if len(abilities) == 2:
                        count += 1
                        pokemon_with_two.append(pokemon_name)
                    # Track Pokemon with 1 ability to verify exclusion
                    elif len(abilities) == 1:
                        pokemon_with_one.append(pokemon_name)
        
        return count, total, pokemon_with_two, pokemon_with_one
    except json.JSONDecodeError:
        # If JSON parsing fails, use regex method
        return count_with_regex(content)

def count_with_regex(content):
    """
    Fallback method using regex to find ability arrays with exactly 2 elements.
    Excludes Pokemon with only 1 ability.
    """
    # Pattern to match "abilities": [ followed by exactly 2 quoted strings
    # This explicitly excludes 1-element arrays (no comma) and 3+ element arrays
    pattern = r'"abilities":\s*\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]'
    
    matches = re.findall(pattern, content)
    count = len(matches)
    
    # Also get Pokemon names - find the pattern before each abilities match
    pokemon_with_two = []
    for match in re.finditer(pattern, content):
        # Look backwards to find the Pokemon name
        before_match = content[:match.start()]
        # Find the last "PokemonName": { pattern before this match
        name_match = re.search(r'"([^"]+)":\s*\{[^}]*"abilities":\s*\[\s*"[^"]+"\s*,\s*"[^"]+"\s*\]', 
                               content[max(0, match.start()-500):match.end()])
        if name_match:
            # Extract the Pokemon name
            full_match = re.search(r'"([^"]+)":\s*\{', before_match[-500:])
            if full_match:
                pokemon_with_two.append(full_match.group(1))
    
    # Count total Pokemon by counting "PokemonName": { patterns
    total_pattern = r'"([^"]+)":\s*\{'
    total_matches = re.findall(total_pattern, content)
    total = len(set(total_matches))  # Use set to avoid duplicates
    
    # For regex method, we can't easily detect 1-element arrays, so return empty list
    pokemon_with_one = []
    
    return count, total, pokemon_with_two, pokemon_with_one

if __name__ == '__main__':
    file_path = 'app/lib/pokedex/black.js'
    
    print(f"Analyzing pokedex file: {file_path}")
    print("-" * 60)
    
    result = count_pokemon_with_two_abilities(file_path)
    if len(result) == 4:
        count, total, pokemon_with_two, pokemon_with_one = result
    else:
        # Fallback for regex method
        count, total, pokemon_with_two = result
        pokemon_with_one = []
    
    print(f"Total Pokemon in pokedex: {total}")
    print(f"Pokemon with exactly 2 abilities: {count}")
    if pokemon_with_one:
        print(f"Pokemon with only 1 ability (excluded): {len(pokemon_with_one)}")
    print(f"Percentage: {(count/total*100):.2f}%")
    print()
    print("Pokemon with 2 abilities:")
    for i, name in enumerate(pokemon_with_two, 1):
        print(f"  {i}. {name}")

