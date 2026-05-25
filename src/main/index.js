// Modules to control application life and create native browser window
const { electronApp, optimizer, is } = require('@electron-toolkit/utils');
const { app, shell, BrowserWindow, screen, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const devStateFile = () => path.join(app.getPath('userData'), 'dev-window-state.json');

function loadDevWindowState() {
  try {
    return JSON.parse(fs.readFileSync(devStateFile(), 'utf-8'));
  } catch {
    return null;
  }
}

function saveDevWindowState(state) {
  try {
    fs.writeFileSync(devStateFile(), JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save dev window state', e);
  }
}

function boundsOnScreen(bounds) {
  if (!bounds) return false;
  return screen.getAllDisplays().some((d) => {
    const b = d.bounds;
    return (
      bounds.x < b.x + b.width &&
      bounds.x + bounds.width > b.x &&
      bounds.y < b.y + b.height &&
      bounds.y + bounds.height > b.y
    );
  });
}

// The icon files live at the project root in dev (and are copied into resources at build time).
// In dev, __dirname is .../out/main, so go up two. In prod, the packed app's root is two levels above out/main as well.
function rootIconPath(file) {
  return path.join(__dirname, '..', '..', file);
}

function createWindow() {
  const savedState = is.dev ? loadDevWindowState() : null;
  const useSaved = !!(savedState && boundsOnScreen(savedState.bounds));

  const windowOptions = {
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    icon: rootIconPath('icon-black.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: false,
      nodeIntegration: true,
    },
  };
  if (useSaved) {
    Object.assign(windowOptions, savedState.bounds);
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow(windowOptions);

  if (useSaved && savedState.isFullScreen) {
    mainWindow.setFullScreen(true);
  }

  // Swap the taskbar/window icon based on the selected game in the renderer.
  const gameIconFile = (game) => {
    switch (game) {
      case 'Black':
        return 'icon-black.ico';
      case 'White':
        return 'icon-white.ico';
      case 'Black 2':
        return 'icon-black2.ico';
      case 'White 2':
        return 'icon-white2.ico';
      default:
        return 'icon-black.ico';
    }
  };
  ipcMain.on('set-game-icon', (_event, game) => {
    const img = nativeImage.createFromPath(rootIconPath(gameIconFile(game)));
    if (!img.isEmpty()) {
      mainWindow.setIcon(img);
    }
  });

  ipcMain.handle('settings_dir', () => app.getPath('userData'));

  if (is.dev) {
    mainWindow.on('close', () => {
      saveDevWindowState({
        bounds: mainWindow.getNormalBounds(),
        isFullScreen: mainWindow.isFullScreen(),
      });
    });
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    if (is.dev) {
      // Open detached so the docked panel doesn't shrink the renderer viewport,
      // which would otherwise rescale the 1920x1080 design via the scaling script.
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Forward renderer console output to the main process terminal in dev,
  // so we can see runtime errors without opening DevTools in the window.
  if (is.dev) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      const tag = levels[level] || `LVL${level}`;
      console.log(`[renderer ${tag}] ${message} (${sourceId}:${line})`);
    });
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
    window._userData = app.getPath('userData');
  });

  createWindow();
});
