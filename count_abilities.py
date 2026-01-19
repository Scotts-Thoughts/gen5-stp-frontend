#!/usr/bin/env python3
"""
Script to modify Pokemon ability arrays in the pokedex.
For Pokemon with exactly 2 abilities, duplicates the first ability and inserts it between the two.
"""

import re
import json
from typing import Tuple, List

def modify_abilities_in_file(file_path: str) -> Tuple[int, List[str]]:
    """
    Modifies the JavaScript pokedex file to duplicate the first ability
    for Pokemon with exactly 2 abilities.
    
    Args:
        file_path: Path to the black.js pokedex file
        
    Returns:
        Tuple of (count_modified, modified_pokemon_names)
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match "abilities": [ followed by exactly 2 quoted strings
    # Matches the format: "abilities": [\n            "Ability1",\n            "Ability2"\n        ]
    # Uses flexible whitespace matching but ensures exactly 2 abilities
    pattern = r'("abilities":\s*\[\s*\n\s+"([^"]+)"\s*,\s*\n\s+"([^"]+)"\s*\n\s+\])'
    
    modified_count = 0
    modified_pokemon = []
    
    def replace_abilities(match):
        """Replacement function that duplicates the first ability"""
        nonlocal modified_count, modified_pokemon
        
        full_match = match.group(1)
        ability1 = match.group(2)
        ability2 = match.group(3)
        
        # Find the Pokemon name by looking backwards from the match
        match_start = match.start()
        before_match = content[:match_start]
        
        # Find the Pokemon name (look for the last top-level key with 4 spaces indentation)
        # Top-level Pokemon names have 4 spaces, nested keys have 8+ spaces
        name_pattern = r'^\s{4}"([^"]+)":\s*\{'
        name_matches = list(re.finditer(name_pattern, before_match, re.MULTILINE))
        if name_matches:
            pokemon_name = name_matches[-1].group(1)
            modified_pokemon.append(pokemon_name)
        
        # Create the replacement with duplicated first ability
        # Preserve the original formatting structure (12 spaces for entries, 8 for closing bracket)
        # Format: "abilities": [\n            "Ability1",\n            "Ability1",\n            "Ability2"\n        ]
        replacement = f'"abilities": [\n            "{ability1}",\n            "{ability1}",\n            "{ability2}"\n        ]'
        
        modified_count += 1
        return replacement
    
    # Find all matches and replace them
    new_content = re.sub(pattern, replace_abilities, content)
    
    # Write the modified content back to the file
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[OK] Successfully modified {file_path}")
    else:
        print("No modifications were made.")
    
    return modified_count, modified_pokemon

def verify_modifications(file_path: str) -> Tuple[int, int]:
    """
    Verifies the modifications by counting Pokemon with different ability counts.
    
    Returns:
        Tuple of (pokemon_with_2_abilities, pokemon_with_3_abilities)
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the const declaration and semicolon
    json_content = content.replace('const pokedex_black = ', '').rstrip().rstrip(';')
    
    try:
        pokedex = json.loads(json_content)
        count_2 = 0
        count_3 = 0
        
        for pokemon_name, pokemon_data in pokedex.items():
            if 'abilities' in pokemon_data:
                abilities = pokemon_data['abilities']
                if isinstance(abilities, list):
                    if len(abilities) == 2:
                        count_2 += 1
                    elif len(abilities) == 3:
                        count_3 += 1
        
        return count_2, count_3
    except json.JSONDecodeError:
        return 0, 0

if __name__ == '__main__':
    file_path = 'app/lib/pokedex/black.js'
    
    print(f"Modifying pokedex file: {file_path}")
    print("-" * 60)
    
    # Create a backup first
    print("Creating backup...")
    with open(file_path, 'r', encoding='utf-8') as f:
        backup_content = f.read()
    backup_path = file_path + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(backup_content)
    print(f"[OK] Backup created: {backup_path}")
    print()
    
    # Verify initial state
    count_2_before, count_3_before = verify_modifications(file_path)
    print(f"Before modification:")
    print(f"  Pokemon with 2 abilities: {count_2_before}")
    print(f"  Pokemon with 3 abilities: {count_3_before}")
    print()
    
    # Perform modifications
    modified_count, modified_pokemon = modify_abilities_in_file(file_path)
    
    print(f"Modified {modified_count} Pokemon")
    print()
    
    # Verify final state
    count_2_after, count_3_after = verify_modifications(file_path)
    print(f"After modification:")
    print(f"  Pokemon with 2 abilities: {count_2_after}")
    print(f"  Pokemon with 3 abilities: {count_3_after}")
    print()
    
    if modified_pokemon:
        print(f"Modified Pokemon (first 10):")
        for i, name in enumerate(modified_pokemon[:10], 1):
            print(f"  {i}. {name}")
        if len(modified_pokemon) > 10:
            print(f"  ... and {len(modified_pokemon) - 10} more")
