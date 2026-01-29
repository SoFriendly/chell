import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Home,
  Settings,
  Terminal as TerminalIcon,
  X,
  GitBranch,
  HelpCircle,
  Plus,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
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
  const [activeTab, setActiveTab] = useState<"terminal" | "history" | "settings">("terminal");
  const [activeSidebarItem, setActiveSidebarItem] = useState<"terminal" | "settings">("terminal");
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
    <div className="flex h-full bg-background">
      {/* Left icon sidebar */}
      <div className="flex w-12 flex-col items-center border-r border-border bg-background py-3">
        {/* Top icons */}
        <div className="flex flex-col items-center gap-1">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveSidebarItem("terminal")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  activeSidebarItem === "terminal"
                    ? "bg-portal-orange/20 text-portal-orange"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <TerminalIcon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Terminal</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate("/")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">New Project</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setActiveSidebarItem("settings");
                  setShowSettings(true);
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  activeSidebarItem === "settings"
                    ? "bg-portal-orange/20 text-portal-orange"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom icons */}
        <div className="flex flex-col items-center gap-1">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Help</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left sidebar - Git panel */}
          <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
            <div className="flex h-full flex-col">
              {/* Project header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Home className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-semibold">{currentProject.name}</h1>
                  {currentBranch && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {currentBranch.name}
                    </p>
                  )}
                </div>
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
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors",
                    activeTab === "terminal"
                      ? "border-b-2 border-portal-orange text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Terminal
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors",
                    activeTab === "history"
                      ? "border-b-2 border-portal-orange text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  History
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors",
                    activeTab === "settings"
                      ? "border-b-2 border-portal-orange text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Settings
                </button>
              </div>

              {/* Tab content - keep terminal mounted, hide with CSS */}
              <div className={cn("flex flex-1 flex-col overflow-hidden", activeTab !== "terminal" && "hidden")}>
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

              <div className={cn("flex-1 overflow-auto p-6", activeTab !== "history" && "hidden")}>
                <h2 className="mb-4 text-lg font-semibold">Commit History</h2>
                <p className="text-sm text-muted-foreground">
                  Coming soon...
                </p>
              </div>

              <div className={cn("flex-1 overflow-auto p-6", activeTab !== "settings" && "hidden")}>
                <h2 className="mb-4 text-lg font-semibold">Project Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Path: {currentProject.path}
                </p>
              </div>
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
                  <span className="text-sm font-medium">Shell</span>
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
