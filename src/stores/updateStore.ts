import { create } from 'zustand';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  version: string;
  body?: string;
}

interface UpdateState {
  updateAvailable: UpdateInfo | null;
  isChecking: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
  downloadProgress: number;
  updateRef: Update | null;
  // Actions
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismiss: () => void;
  showUpdate: (info: UpdateInfo, update: Update) => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: null,
  isChecking: false,
  isDownloading: false,
  isInstalling: false,
  downloadProgress: 0,
  updateRef: null,

  checkForUpdates: async () => {
    set({ isChecking: true });
    try {
      const update = await check();
      if (update) {
        let body = update.body;
        // Fetch notes from latest.json as fallback if body is missing
        if (!body) {
          try {
            const response = await fetch('https://releases.chell.app/latest.json');
            const data = await response.json();
            body = data.notes;
          } catch (e) {
            console.error('Failed to fetch release notes:', e);
          }
        }
        set({
          updateAvailable: {
            version: update.version,
            body,
          },
          updateRef: update,
        });
      }
    } catch (error) {
      // Log detailed error info for debugging
      console.error('Failed to check for updates:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    } finally {
      set({ isChecking: false });
    }
  },

  downloadAndInstall: async () => {
    const { updateRef } = get();
    if (!updateRef) return;

    set({ isDownloading: true, downloadProgress: 0 });
    try {
      let contentLength = 0;
      let downloaded = 0;

      await updateRef.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            downloaded = 0;
            set({ downloadProgress: 0 });
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const progress = contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0;
            set({ downloadProgress: progress });
            break;
          case 'Finished':
            set({ downloadProgress: 100, isDownloading: false, isInstalling: true });
            break;
        }
      });

      await relaunch();
    } catch (error) {
      console.error('Failed to download/install update:', error);
      set({ isDownloading: false, isInstalling: false });
      throw error;
    }
  },

  dismiss: () => {
    set({
      updateAvailable: null,
      updateRef: null,
      downloadProgress: 0,
    });
  },

  showUpdate: (info: UpdateInfo, update: Update) => {
    set({
      updateAvailable: info,
      updateRef: update,
    });
  },
}));
