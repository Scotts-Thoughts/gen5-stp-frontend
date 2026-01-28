/**
 * Style Settings Manager
 * 
 * Handles layered storage for Pokemon style settings:
 * - Default settings (ship with the app, stored in default_style_settings.js)
 * - User settings (stored in localStorage, override defaults)
 * 
 * In DEV mode: Style changes are saved to the defaults file
 * In PROD mode: Style changes are saved to localStorage as user overrides
 */

const fs = require('fs');
const path = require('path');

class StyleSettingsManager {
    constructor() {
        // Detect if running in development mode
        // In Electron, we can check if we're running from source vs packaged app
        this.isDev = this._detectDevMode();
        
        // Path to the default settings file
        this.defaultSettingsPath = path.join(__dirname, 'default_style_settings.js');
        
        // Load default settings
        this.defaultSettings = this._loadDefaultSettings();
        
        // Cache for user settings (loaded from localStorage)
        this.userSettingsCache = {};
        
        // List of style property keys that should use the layered system
        this.stylePropertyKeys = [
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
            'frame'
        ];
        
        console.log(`[StyleSettingsManager] Initialized in ${this.isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
    }
    
    /**
     * Detect if running in development mode
     */
    _detectDevMode() {
        try {
            // Check multiple indicators for dev mode
            let isPackaged = false;
            
            // 1. Try to get isPackaged from electron (works in main process)
            try {
                const { app } = require('@electron/remote') || require('electron');
                isPackaged = app?.isPackaged ?? false;
            } catch (e) {
                // If we can't access electron app, try other methods
            }
            
            // 2. Check NODE_ENV
            const nodeEnvDev = process.env.NODE_ENV === 'development';
            
            // 3. Check if running from node_modules/.bin/electron (common in dev)
            const execPath = process.execPath || '';
            const runningFromNodeModules = execPath.includes('node_modules');
            
            // 4. Check if we're in an asar archive (packaged apps use asar)
            const inAsar = __dirname.includes('.asar');
            
            // 5. Check for electron-builder's build artifacts
            const hasResourcesFolder = fs.existsSync(path.join(__dirname, '..', '..', 'resources'));
            
            // In dev mode if:
            // - NOT packaged OR
            // - Explicitly set to development OR  
            // - Running from node_modules (dev mode) OR
            // - NOT in an asar archive (dev mode doesn't package to asar)
            const isDev = !isPackaged || nodeEnvDev || runningFromNodeModules || !inAsar;
            
            console.log('[StyleSettingsManager] Dev mode detection:', {
                isPackaged,
                nodeEnvDev,
                runningFromNodeModules,
                inAsar,
                execPath: execPath.substring(0, 50) + '...',
                result: isDev
            });
            
            return isDev;
        } catch (e) {
            // If we can't detect, default to production mode for safety
            console.warn('[StyleSettingsManager] Could not detect dev mode, defaulting to production:', e.message);
            return false;
        }
    }
    
    /**
     * Load default settings from the JS file
     */
    _loadDefaultSettings() {
        try {
            // Clear require cache to get fresh settings
            delete require.cache[require.resolve('./default_style_settings.js')];
            return require('./default_style_settings.js');
        } catch (e) {
            console.warn('[StyleSettingsManager] Could not load default settings:', e.message);
            return {};
        }
    }
    
    /**
     * Check if a storage key is for style settings (game_species format)
     */
    isStyleSettingsKey(key) {
        // Style settings keys follow the pattern:
        // "GameName_Species" (e.g., "Black_Tepig")
        // "GameName_FullyEvolved-line-Species" (e.g., "Black_Emboar-line-Tepig")
        // "FullyEvolved-line" (e.g., "Emboar-line") for family settings
        
        // Exclude known non-style keys
        const nonStyleKeys = [
            'starter', 'selected_game', 'playerName', 'playerId', 'playerResets',
            'blackout_counter', 'simple_data_str', 'full_data_str', 'deprecated_data_str',
            'simple_data', 'timer_startTimeOffset', 'timer_startTime', 'timer_pause',
            'timer_formatted_time', 'timer_pause_time', 'time_h', 'time_m', 'time_s',
            'time_ms', 'time_split_start', 'battle_start', 'current_splits', 'previous_splits'
        ];
        
        if (nonStyleKeys.includes(key)) {
            return false;
        }
        
        // Check if key contains underscore with game prefix pattern or is a line pattern
        // Gen5 games: Black, White, Black 2, White 2
        const gamePattern = /^(Black|White|Black 2|White 2)_/;
        const linePattern = /-line$/;
        
        return gamePattern.test(key) || linePattern.test(key);
    }
    
    /**
     * Get a value with layered lookup: user override -> default
     */
    get(key) {
        // For non-style keys, just return from localStorage directly
        if (!this.isStyleSettingsKey(key)) {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
        
        // Get user override from localStorage
        const userRaw = localStorage.getItem(`user_${key}`);
        const userValue = userRaw ? JSON.parse(userRaw) : null;
        
        // Get default value
        const defaultValue = this.defaultSettings[key] || null;
        
        // Merge: user overrides take precedence
        if (userValue === null && defaultValue === null) {
            return null;
        }
        
        if (userValue === null) {
            return defaultValue;
        }
        
        if (defaultValue === null) {
            return userValue;
        }
        
        // Both exist - merge with user values taking precedence
        return { ...defaultValue, ...userValue };
    }
    
    /**
     * Set a value, handling dev vs prod mode
     */
    set(key, value) {
        // For non-style keys, just save to localStorage directly
        if (!this.isStyleSettingsKey(key)) {
            if (value === undefined || value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
            return;
        }
        
        if (this.isDev) {
            // In dev mode, save to default settings file
            this._saveToDefaults(key, value);
        } else {
            // In prod mode, save to localStorage as user override
            this._saveToUserStorage(key, value);
        }
    }
    
    /**
     * Save to default settings file (dev mode)
     */
    _saveToDefaults(key, value) {
        // Update in-memory defaults
        if (value === undefined || value === null) {
            delete this.defaultSettings[key];
        } else {
            // Merge with existing default to preserve other properties
            this.defaultSettings[key] = {
                ...(this.defaultSettings[key] || {}),
                ...value
            };
        }
        
        // Write to file
        this._writeDefaultsFile();
        
        // Also update localStorage for immediate use (but as defaults, not user overrides)
        localStorage.setItem(key, JSON.stringify(this.defaultSettings[key]));
    }
    
    /**
     * Save to user storage (prod mode)
     */
    _saveToUserStorage(key, value) {
        if (value === undefined || value === null) {
            localStorage.removeItem(`user_${key}`);
        } else {
            // Only save the properties that differ from defaults
            const defaultValue = this.defaultSettings[key] || {};
            const userOverrides = {};
            
            // Find properties that differ from default
            for (const prop in value) {
                if (JSON.stringify(value[prop]) !== JSON.stringify(defaultValue[prop])) {
                    userOverrides[prop] = value[prop];
                }
            }
            
            if (Object.keys(userOverrides).length > 0) {
                localStorage.setItem(`user_${key}`, JSON.stringify(userOverrides));
            } else {
                // No differences, remove user override
                localStorage.removeItem(`user_${key}`);
            }
        }
        
        // Also update the main key for immediate use
        localStorage.setItem(key, JSON.stringify(value));
    }
    
    /**
     * Write default settings to the JS file
     */
    _writeDefaultsFile() {
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

const DEFAULT_STYLE_SETTINGS = ${JSON.stringify(this.defaultSettings, null, 4)};

// Export for use in the application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_STYLE_SETTINGS;
}
`;
        
        try {
            fs.writeFileSync(this.defaultSettingsPath, content, 'utf8');
            console.log('[StyleSettingsManager] Saved default settings to file');
        } catch (e) {
            console.error('[StyleSettingsManager] Failed to write default settings file:', e.message);
        }
    }
    
    /**
     * Reset a specific key to defaults (remove user overrides)
     */
    resetToDefaults(key) {
        localStorage.removeItem(`user_${key}`);
        
        // Restore the default value to the main key
        const defaultValue = this.defaultSettings[key];
        if (defaultValue) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
        } else {
            localStorage.removeItem(key);
        }
    }
    
    /**
     * Reset all style settings to defaults
     */
    resetAllToDefaults() {
        // Get all localStorage keys
        const keys = Object.keys(localStorage);
        
        // Remove all user_ prefixed keys (user overrides)
        keys.forEach(key => {
            if (key.startsWith('user_') && this.isStyleSettingsKey(key.replace('user_', ''))) {
                localStorage.removeItem(key);
            }
        });
        
        // Restore defaults
        Object.keys(this.defaultSettings).forEach(key => {
            localStorage.setItem(key, JSON.stringify(this.defaultSettings[key]));
        });
        
        console.log('[StyleSettingsManager] Reset all style settings to defaults');
    }
    
    /**
     * Export current localStorage settings to be used as new defaults
     * This is useful for migrating existing settings to the defaults file
     */
    exportCurrentAsDefaults() {
        const exported = {};
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (this.isStyleSettingsKey(key) && !key.startsWith('user_')) {
                try {
                    const value = JSON.parse(localStorage.getItem(key));
                    if (value && typeof value === 'object') {
                        // Only include style-related properties
                        const styleValue = {};
                        this.stylePropertyKeys.forEach(prop => {
                            if (prop in value) {
                                styleValue[prop] = value[prop];
                            }
                        });
                        if (Object.keys(styleValue).length > 0) {
                            exported[key] = styleValue;
                        }
                    }
                } catch (e) {
                    // Skip invalid entries
                }
            }
        });
        
        return exported;
    }
    
    /**
     * Import settings into defaults (dev mode) or user settings (prod mode)
     */
    importSettings(settings) {
        Object.keys(settings).forEach(key => {
            this.set(key, settings[key]);
        });
    }
    
    /**
     * Check if user has any overrides for a key
     */
    hasUserOverrides(key) {
        return localStorage.getItem(`user_${key}`) !== null;
    }
    
    /**
     * Get only the user overrides for a key
     */
    getUserOverrides(key) {
        const raw = localStorage.getItem(`user_${key}`);
        return raw ? JSON.parse(raw) : null;
    }
    
    /**
     * Get only the default value for a key
     */
    getDefault(key) {
        return this.defaultSettings[key] || null;
    }
}

// Export singleton instance
const styleSettingsManager = new StyleSettingsManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = styleSettingsManager;
}

