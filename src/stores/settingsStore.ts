import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, AIProvider, Snippet, ThemeOption } from '@/types';

interface SettingsState extends Settings {
  defaultAssistant: string;
  // Actions
  setTheme: (theme: ThemeOption) => void;
  setAIProvider: (provider: AIProvider | undefined) => void;
  setAssistantArgs: (assistantId: string, args: string) => void;
  addGlobalSnippet: (snippet: Snippet) => void;
  removeGlobalSnippet: (id: string) => void;
  updateGlobalSnippet: (id: string, updates: Partial<Snippet>) => void;
  setDefaultClonePath: (path: string | undefined) => void;
  setDefaultAssistant: (assistantId: string) => void;
  setAutoCommitMessage: (enabled: boolean) => void;
  setAutoFetchRemote: (enabled: boolean) => void;
}

// Apply theme to document
export const applyTheme = (theme: ThemeOption) => {
  const root = document.documentElement;
  // Remove all theme classes
  root.classList.remove('dark', 'tokyo', 'light');

  if (theme === 'light') {
    // Light mode - no class needed (uses :root)
  } else {
    // Add the theme class
    root.classList.add(theme);
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      aiProvider: undefined,
      assistantArgs: {},
      globalSnippets: [],
      defaultClonePath: undefined,
      defaultAssistant: 'claude',
      autoCommitMessage: true,
      autoFetchRemote: false,

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setAIProvider: (provider) => set({ aiProvider: provider }),

      setAssistantArgs: (assistantId, args) => set((state) => ({
        assistantArgs: { ...state.assistantArgs, [assistantId]: args },
      })),

      addGlobalSnippet: (snippet) => set((state) => ({
        globalSnippets: [...state.globalSnippets, snippet],
      })),

      removeGlobalSnippet: (id) => set((state) => ({
        globalSnippets: state.globalSnippets.filter((s) => s.id !== id),
      })),

      updateGlobalSnippet: (id, updates) => set((state) => ({
        globalSnippets: state.globalSnippets.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      })),

      setDefaultClonePath: (path) => set({ defaultClonePath: path }),

      setDefaultAssistant: (assistantId) => set({ defaultAssistant: assistantId }),

      setAutoCommitMessage: (enabled) => set({ autoCommitMessage: enabled }),

      setAutoFetchRemote: (enabled) => set({ autoFetchRemote: enabled }),
    }),
    {
      name: 'chell-settings',
      onRehydrateStorage: () => (state) => {
        // Apply saved theme on load
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
