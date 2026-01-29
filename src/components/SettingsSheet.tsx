import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Settings, Key, Bot, Zap, Palette, Check, FolderOpen, Cog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProvider } from "@/types";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AI_PROVIDERS = [
  { id: "anthropic", name: "Anthropic", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"] },
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4-turbo"] },
  { id: "groq", name: "Groq", models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"] },
  { id: "custom", name: "Custom (OpenAI-compatible)", models: [] },
];

export default function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const {
    theme,
    setTheme,
    aiProvider,
    setAIProvider,
    assistantArgs,
    setAssistantArgs,
    defaultClonePath,
    setDefaultClonePath,
  } = useSettingsStore();
  const [selectedProvider, setSelectedProvider] = useState(aiProvider?.id || "");
  const [apiKey, setApiKey] = useState(aiProvider?.apiKey || "");
  const [model, setModel] = useState(aiProvider?.model || "");
  const [customEndpoint, setCustomEndpoint] = useState(aiProvider?.endpoint || "");
  const [claudeCodeArgs, setClaudeCodeArgs] = useState(assistantArgs["claude-code"] || "");
  const [aiderArgs, setAiderArgs] = useState(assistantArgs["aider"] || "");
  const [testingConnection, setTestingConnection] = useState(false);
  const [localDefaultClonePath, setLocalDefaultClonePath] = useState(defaultClonePath || "");

  const handleSaveAIProvider = () => {
    if (!selectedProvider) {
      setAIProvider(undefined);
      toast.success("AI provider cleared");
      return;
    }

    const provider: AIProvider = {
      id: selectedProvider,
      name: AI_PROVIDERS.find((p) => p.id === selectedProvider)?.name || selectedProvider,
      apiKey,
      model,
      endpoint: selectedProvider === "custom" ? customEndpoint : undefined,
    };

    setAIProvider(provider);
    toast.success("AI provider saved");
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error("Please enter an API key");
      return;
    }
    setTestingConnection(true);
    try {
      await invoke("test_ai_connection", {
        provider: selectedProvider,
        apiKey,
        model,
        endpoint: customEndpoint || undefined,
      });
      toast.success("Connection successful");
    } catch (error) {
      toast.error("Connection failed");
      console.error(error);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAssistantArgs = () => {
    setAssistantArgs("claude-code", claudeCodeArgs);
    setAssistantArgs("aider", aiderArgs);
    toast.success("Assistant settings saved");
  };

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
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const handleSaveGeneralSettings = () => {
    setDefaultClonePath(localDefaultClonePath || undefined);
    toast.success("General settings saved");
  };

  const handleClearDefaultClonePath = () => {
    setLocalDefaultClonePath("");
    setDefaultClonePath(undefined);
    toast.success("Default clone path cleared");
  };

  const currentProviderModels = AI_PROVIDERS.find((p) => p.id === selectedProvider)?.models || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure Chell to your preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              AI
            </TabsTrigger>
            <TabsTrigger value="assistants" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Assistants
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Default Clone Path</h3>
                    <p className="text-xs text-muted-foreground">
                      All cloned repositories will be placed in this directory by default
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., ~/Projects"
                      value={localDefaultClonePath}
                      onChange={(e) => setLocalDefaultClonePath(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSelectDefaultClonePath}
                      title="Browse..."
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  {localDefaultClonePath && (
                    <p className="text-xs text-muted-foreground">
                      Repos will be cloned to: {localDefaultClonePath}/repo-name
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveGeneralSettings}>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  {localDefaultClonePath && (
                    <Button variant="outline" onClick={handleClearDefaultClonePath}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Provider Settings */}
          <TabsContent value="ai" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (AI features disabled)</SelectItem>
                      {AI_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProvider && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Key</label>
                      <Input
                        type="password"
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your API key is stored securely in the system keychain
                      </p>
                    </div>

                    {selectedProvider === "custom" ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Endpoint URL</label>
                          <Input
                            placeholder="https://api.example.com/v1"
                            value={customEndpoint}
                            onChange={(e) => setCustomEndpoint(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Model</label>
                          <Input
                            placeholder="Model name"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Model</label>
                        <Select value={model} onValueChange={setModel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentProviderModels.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testingConnection || !apiKey}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {testingConnection ? "Testing..." : "Test Connection"}
                      </Button>
                      <Button onClick={handleSaveAIProvider}>
                        <Check className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </>
                )}

                {!selectedProvider && (
                  <Button onClick={handleSaveAIProvider}>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Assistant Settings */}
          <TabsContent value="assistants" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Claude Code</h3>
                    <p className="text-xs text-muted-foreground">
                      Default arguments for Claude Code
                    </p>
                  </div>
                  <Input
                    placeholder="e.g., --dangerously-skip-permissions"
                    value={claudeCodeArgs}
                    onChange={(e) => setClaudeCodeArgs(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Aider</h3>
                    <p className="text-xs text-muted-foreground">
                      Default arguments for Aider
                    </p>
                  </div>
                  <Input
                    placeholder="e.g., --model gpt-4"
                    value={aiderArgs}
                    onChange={(e) => setAiderArgs(e.target.value)}
                  />
                </div>

                <Button onClick={handleSaveAssistantArgs}>
                  <Check className="mr-2 h-4 w-4" />
                  Save Assistant Settings
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <Select
                    value={theme}
                    onValueChange={(value: "light" | "dark" | "system") => {
                      setTheme(value);
                      // Apply theme to document
                      if (value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                        document.documentElement.classList.add("dark");
                      } else {
                        document.documentElement.classList.remove("dark");
                      }
                      toast.success(`Theme set to ${value}`);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Dark mode is recommended for terminal work
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
