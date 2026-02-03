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
        set({
          updateAvailable: {
            version: update.version,
            body: update.body,
          },
          updateRef: update,
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
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
