import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Settings,
  Circle,
  Palette,
  Sparkles,
  Keyboard,
  Info,
  FolderOpen,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "general" | "appearance" | "ai" | "keyboard" | "about";

const NAV_ITEMS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Circle className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "ai", label: "AI Behavior", icon: <Sparkles className="h-4 w-4" /> },
  { id: "keyboard", label: "Keyboard", icon: <Keyboard className="h-4 w-4" /> },
  { id: "about", label: "About", icon: <Info className="h-4 w-4" /> },
];

const THEMES = [
  { id: "dark", name: "Chell Dark", gradient: "from-portal-orange/60 to-neutral-900" },
  { id: "tokyo", name: "Tokyo Night", gradient: "from-indigo-500/60 to-slate-900" },
  { id: "light", name: "Light", gradient: "from-slate-200 to-slate-100" },
];

export default function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const {
    theme,
    setTheme,
    assistantArgs,
    setAssistantArgs,
    defaultClonePath,
    setDefaultClonePath,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [localDefaultClonePath, setLocalDefaultClonePath] = useState(defaultClonePath || "");
  const [claudeCodeArgs, setClaudeCodeArgs] = useState(assistantArgs["claude-code"] || "");
  const [aiderArgs, setAiderArgs] = useState(assistantArgs["aider"] || "");

  // AI behavior toggles
  const [autoCommitMessage, setAutoCommitMessage] = useState(true);
  const [autoFetchRemote, setAutoFetchRemote] = useState(false);

  const handleSelectDefaultClonePath = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "Select Default Clone Directory",
        defaultPath: localDefaultClonePath || undefined,
      });

      if (selected && typeof selected === "string") {
        setLocalDefaultClonePath(selected);
        setDefaultClonePath(selected);
        toast.success("Default clone path updated");
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const handleSaveAssistantArgs = () => {
    setAssistantArgs("claude-code", claudeCodeArgs);
    setAssistantArgs("aider", aiderArgs);
    toast.success("Assistant settings saved");
  };

  const handleThemeChange = (newTheme: string) => {
    const themeValue = newTheme === "light" ? "light" : "dark";
    setTheme(themeValue);
    if (themeValue === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.success(`Theme set to ${newTheme}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <div className="flex h-[500px]">
          {/* Left sidebar navigation */}
          <div className="w-48 border-r border-border bg-card p-2">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeTab === item.id
                      ? "bg-portal-orange/10 text-portal-orange"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span className={activeTab === item.id ? "text-portal-orange" : ""}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-8">
                  {/* Git Configuration Section */}
                  <section>
                    <h2 className="text-lg font-semibold">Git Configuration</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Manage your global git identity and repository behaviors.
                    </p>

                    <div className="space-y-6">
                      {/* Default Clone Path */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Default Clone Path</p>
                          <p className="text-xs text-muted-foreground">
                            All cloned repositories will be placed in this directory.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={localDefaultClonePath}
                            onChange={(e) => {
                              setLocalDefaultClonePath(e.target.value);
                              setDefaultClonePath(e.target.value || undefined);
                            }}
                            placeholder="~/Projects"
                            className="w-56 h-9 bg-muted/50"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={handleSelectDefaultClonePath}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Auto Fetch Remote */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Auto-Fetch Remote</p>
                          <p className="text-xs text-muted-foreground">
                            Periodically check for upstream changes in the background.
                          </p>
                        </div>
                        <Switch
                          checked={autoFetchRemote}
                          onCheckedChange={setAutoFetchRemote}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Assistant Arguments Section */}
                  <section>
                    <h2 className="text-lg font-semibold">Assistant Configuration</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Default launch arguments for coding assistants.
                    </p>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Claude Code</p>
                          <p className="text-xs text-muted-foreground">
                            Arguments passed when launching Claude Code.
                          </p>
                        </div>
                        <Input
                          value={claudeCodeArgs}
                          onChange={(e) => setClaudeCodeArgs(e.target.value)}
                          placeholder="--dangerously-skip-permissions"
                          className="w-56 h-9 bg-muted/50"
                          onBlur={handleSaveAssistantArgs}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Aider</p>
                          <p className="text-xs text-muted-foreground">
                            Arguments passed when launching Aider.
                          </p>
                        </div>
                        <Input
                          value={aiderArgs}
                          onChange={(e) => setAiderArgs(e.target.value)}
                          placeholder="--model gpt-4"
                          className="w-56 h-9 bg-muted/50"
                          onBlur={handleSaveAssistantArgs}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-lg font-semibold">Appearance</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Customize the look and feel of your terminal environment.
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleThemeChange(t.id)}
                          className={cn(
                            "group relative rounded-lg border-2 p-1 transition-all",
                            theme === (t.id === "light" ? "light" : "dark") && t.id !== "tokyo"
                              ? "border-portal-orange"
                              : "border-transparent hover:border-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "h-20 rounded-md bg-gradient-to-br",
                              t.gradient
                            )}
                          />
                          <p className="mt-2 text-center text-xs font-medium">
                            {t.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* AI Behavior Tab */}
              {activeTab === "ai" && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-lg font-semibold">AI Assistant Behavior</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Tune how the AI interacts with your workflow and code.
                    </p>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Commit Message Generation</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically generate draft commit messages for staged changes.
                          </p>
                        </div>
                        <Switch
                          checked={autoCommitMessage}
                          onCheckedChange={setAutoCommitMessage}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Analysis Deep Scan</p>
                          <p className="text-xs text-muted-foreground">
                            Enables semantic code analysis for better context awareness (Higher token usage).
                          </p>
                        </div>
                        <Switch checked={false} onCheckedChange={() => {}} />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Keyboard Tab */}
              {activeTab === "keyboard" && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Global hotkeys for rapid terminal operations.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm">New Terminal</p>
                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          ⌘ T
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm">Commit Changes</p>
                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          ⌘ Enter
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm">Refresh Git Status</p>
                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          ⌘ R
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm">Toggle Git Panel</p>
                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          ⌘ B
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm">Open Settings</p>
                        <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          ⌘ ,
                        </kbd>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* About Tab */}
              {activeTab === "about" && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-lg font-semibold">About Chell</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      A visual git client designed for AI coding assistants.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="text-sm font-mono">0.1.0</p>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm text-muted-foreground">Build</p>
                        <p className="text-sm font-mono">2026.01.29</p>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <p className="text-sm text-muted-foreground">License</p>
                        <p className="text-sm">MIT</p>
                      </div>
                    </div>

                    <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">
                        Named after the protagonist of Portal—the silent character who escapes
                        through portals. Thematically aligned with the concept of portals between
                        your ideas and your code.
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
