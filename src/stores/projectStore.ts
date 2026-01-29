import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectTab } from '@/types';

interface ProjectState {
  projects: Project[];
  tabs: ProjectTab[];
  activeTabId: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  openTab: (project: Project) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, _get) => ({
      projects: [],
      tabs: [],
      activeTabId: null,

      setProjects: (projects) => set({ projects }),

      addProject: (project) => set((state) => {
        // Check if project already exists (by path)
        const exists = state.projects.some(p => p.path === project.path);
        if (exists) {
          // Update lastOpened instead
          return {
            projects: state.projects.map(p =>
              p.path === project.path ? { ...p, lastOpened: project.lastOpened } : p
            ),
          };
        }
        return { projects: [...state.projects, project] };
      }),

      removeProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        tabs: state.tabs.filter((t) => t.projectId !== id),
      })),

      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),

      openTab: (project) => set((state) => {
        const existingTab = state.tabs.find((t) => t.projectId === project.id);
        if (existingTab) {
          return { activeTabId: existingTab.id };
        }
        const newTab: ProjectTab = {
          id: crypto.randomUUID(),
          projectId: project.id,
          projectName: project.name,
        };
        return {
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        };
      }),

      closeTab: (tabId) => set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== tabId);
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }
        return { tabs: newTabs, activeTabId: newActiveTabId };
      }),

      setActiveTab: (tabId) => set({ activeTabId: tabId }),
    }),
    {
      name: 'chell-projects',
      partialize: (state) => ({ projects: state.projects }), // Only persist projects, not tabs
    }
  )
);