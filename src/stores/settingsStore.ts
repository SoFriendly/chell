import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, AIProvider, Snippet } from '@/types';

interface SettingsState extends Settings {
  defaultAssistant: string;
  // Actions
  setTheme: (theme: Settings['theme']) => void;
  setAIProvider: (provider: AIProvider | undefined) => void;
  setAssistantArgs: (assistantId: string, args: string) => void;
  addGlobalSnippet: (snippet: Snippet) => void;
  removeGlobalSnippet: (id: string) => void;
  updateGlobalSnippet: (id: string, updates: Partial<Snippet>) => void;
  setDefaultClonePath: (path: string | undefined) => void;
  setDefaultAssistant: (assistantId: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      aiProvider: undefined,
      assistantArgs: {},
      globalSnippets: [],
      defaultClonePath: undefined,
      defaultAssistant: 'claude', // Default to Claude Code

      setTheme: (theme) => set({ theme }),

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
    }),
    {
      name: 'chell-settings',
    }
  )
);
