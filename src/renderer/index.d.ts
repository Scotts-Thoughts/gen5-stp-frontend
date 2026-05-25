import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      settings_dir: () => Promise<string>;
      set_game_icon: (game: string) => void;
    };
  }
}
