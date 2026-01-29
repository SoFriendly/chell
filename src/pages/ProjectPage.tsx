import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Home, Settings, Terminal as TerminalIcon, X, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Terminal from "@/components/Terminal";
import GitPanel from "@/components/GitPanel";
import SettingsSheet from "@/components/SettingsSheet";
import { useProjectStore } from "@/stores/projectStore";
import { useGitStore } from "@/stores/gitStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Project, GitStatus, FileDiff, Branch, Commit } from "@/types";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, openTab } = useProjectStore();
  const { setStatus, setDiffs, setBranches, setHistory, setLoading } = useGitStore();
  const { assistantArgs } = useSettingsStore();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [utilityTerminalId, setUtilityTerminalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"terminal" | "settings">("terminal");
  const terminalsStarted = useRef(false);

  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      openTab(project);
      loadGitData(project.path);
    } else {
      loadProjectFromBackend();
    }
  }, [projectId, projects]);

  // Auto-start terminals when project loads
  useEffect(() => {
    if (currentProject && !terminalsStarted.current) {
      terminalsStarted.current = true;
      startTerminals(currentProject.path);
    }
  }, [currentProject]);

  const startTerminals = async (projectPath: string) => {
    try {
      // Start utility terminal (plain shell)
      const utilityId = await invoke<string>("spawn_terminal", {
        shell: "",
        cwd: projectPath,
      });
      setUtilityTerminalId(utilityId);

      // Check for installed assistants and start the default one
      const installed = await invoke<string[]>("check_installed_assistants");

      // Priority: claude-code > aider > shell
      let command = "";
      let assistantName = "Shell";

      if (installed.includes("claude")) {
        command = "claude";
        assistantName = "Claude Code";
        const args = assistantArgs["claude-code"] || "";
        if (args) command = `${command} ${args}`;
      } else if (installed.includes("aider")) {
        command = "aider";
        assistantName = "Aider";
        const args = assistantArgs["aider"] || "";
        if (args) command = `${command} ${args}`;
      }

      // Start the main terminal with the assistant
      const mainId = await invoke<string>("spawn_terminal", {
        shell: command,
        cwd: projectPath,
      });
      setTerminalId(mainId);

      if (command) {
        toast.success(`${assistantName} started`);
      }
    } catch (error) {
      console.error("Failed to start terminals:", error);
    }
  };

  const loadProjectFromBackend = async () => {
    try {
      const project = await invoke<Project | null>("get_project", { id: projectId });
      if (project) {
        setCurrentProject(project);
        openTab(project);
        loadGitData(project.path);
      } else {
        toast.error("Project not found");
        navigate("/");
      }
    } catch {
      toast.error("Failed to load project");
      navigate("/");
    }
  };

  const loadGitData = async (path: string) => {
    setLoading(true);
    try {
      const [status, diffs, branches, history] = await Promise.all([
        invoke<GitStatus>("get_status", { repoPath: path }),
        invoke<FileDiff[]>("get_diff", { repoPath: path }),
        invoke<Branch[]>("get_branches", { repoPath: path }),
        invoke<Commit[]>("get_history", { repoPath: path, limit: 50 }),
      ]);
      setStatus(status);
      setDiffs(diffs);
      setBranches(branches);
      setHistory(history);
    } catch (error) {
      console.error("Failed to load git data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshGitData = useCallback(() => {
    if (currentProject) {
      loadGitData(currentProject.path);
    }
  }, [currentProject]);

  useEffect(() => {
    const unlisten = listen("git-refresh", () => {
      refreshGitData();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const currentBranch = useGitStore.getState().branches.find((b) => b.isHead);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Main content - three column layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left sidebar - Git panel */}
          <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
            <div className="flex h-full flex-col">
              {/* Project header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate("/")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-portal-orange/20 to-orange-600/20 border border-portal-orange/30 transition-all hover:from-portal-orange/30 hover:to-orange-600/30"
                    >
                      <GitBranch className="h-4 w-4 text-portal-orange" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Home</TooltipContent>
                </Tooltip>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-semibold">{currentProject.name}</h1>
                  {currentBranch && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {currentBranch.name}
                    </p>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </div>

              {/* Git panel */}
              <GitPanel
                projectPath={currentProject.path}
                onRefresh={refreshGitData}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border" />

          {/* Center - Terminal area */}
          <ResizablePanel defaultSize={56} minSize={35}>
            <div className="flex h-full flex-col">
              {/* Tab bar */}
              <div className="flex items-center border-b border-border">
                <button
                  onClick={() => setActiveTab("terminal")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === "terminal"
                      ? "border-b-2 border-portal-orange text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Terminal
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === "settings"
                      ? "border-b-2 border-portal-orange text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Settings
                </button>
              </div>

              {/* Tab content */}
              {activeTab === "terminal" && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Terminal */}
                  <div className="flex-1 overflow-hidden bg-[#0d0d0d]">
                    {terminalId ? (
                      <Terminal id={terminalId} cwd={currentProject.path} />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                          Starting terminal...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="flex-1 overflow-auto p-6">
                  <h2 className="mb-4 text-lg font-semibold">Project Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Path: {currentProject.path}
                  </p>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border" />

          {/* Right sidebar - Utility terminal */}
          <ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4 text-portal-orange" />
                  <span className="text-sm font-medium">Utility Terminal</span>
                </div>
                {utilityTerminalId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      invoke("kill_terminal", { id: utilityTerminalId });
                      setUtilityTerminalId(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Utility terminal content */}
              <div className="flex-1 overflow-hidden bg-[#0d0d0d]">
                {utilityTerminalId ? (
                  <Terminal id={utilityTerminalId} cwd={currentProject.path} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <TerminalIcon className="h-6 w-6 text-muted-foreground" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const id = await invoke<string>("spawn_terminal", {
                          shell: "",
                          cwd: currentProject.path,
                        });
                        setUtilityTerminalId(id);
                      }}
                    >
                      Start Shell
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Settings Sheet */}
      <SettingsSheet open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
