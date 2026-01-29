import { create } from 'zustand';
import type { Terminal } from '@/types';

interface TerminalState {
  terminals: Record<string, Terminal>;
  activeTerminalId: string | null;

  // Actions
  addTerminal: (terminal: Terminal) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string | null) => void;
  updateTerminal: (id: string, updates: Partial<Terminal>) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  terminals: {},
  activeTerminalId: null,

  addTerminal: (terminal) => set((state) => ({
    terminals: { ...state.terminals, [terminal.id]: terminal },
    activeTerminalId: terminal.id,
  })),

  removeTerminal: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.terminals;
    return {
      terminals: rest,
      activeTerminalId: state.activeTerminalId === id
        ? Object.keys(rest)[0] || null
        : state.activeTerminalId,
    };
  }),

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  updateTerminal: (id, updates) => set((state) => ({
    terminals: {
      ...state.terminals,
      [id]: { ...state.terminals[id], ...updates },
    },
  })),
}));
