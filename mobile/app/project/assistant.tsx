import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Bot,
  Sparkles,
  Play,
  Terminal,
  Check,
  X,
  Wand2,
  Loader2,
} from "lucide-react-native";
import { useConnectionStore } from "~/stores/connectionStore";
import { useTerminalStore } from "~/stores/terminalStore";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Separator,
} from "~/components/ui";
import type { ProjectContext } from "~/types";

interface Assistant {
  id: string;
  name: string;
  command: string;
  installed: boolean;
}

const KNOWN_ASSISTANTS: Omit<Assistant, "installed">[] = [
  { id: "claude-code", name: "Claude Code", command: "claude" },
  { id: "aider", name: "Aider", command: "aider" },
  { id: "opencode", name: "OpenCode", command: "opencode" },
];

export default function AssistantPage() {
  const { activeProject, invoke } = useConnectionStore();
  const { spawnTerminal } = useTerminalStore();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(
    null
  );
  const [aiInput, setAiInput] = useState("");
  const [generatedCommand, setGeneratedCommand] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const projectPath = activeProject?.path || "";

  const loadAssistants = useCallback(async () => {
    try {
      const installed = await invoke<Record<string, boolean>>(
        "check_installed_assistants"
      );

      const assistantList: Assistant[] = KNOWN_ASSISTANTS.map((a) => ({
        ...a,
        installed: installed[a.id] || false,
      }));

      // Always add shell
      assistantList.push({
        id: "shell",
        name: "Shell",
        command: "",
        installed: true,
      });

      setAssistants(assistantList);
    } catch (err) {
      console.error("Failed to check assistants:", err);
    }
  }, [invoke]);

  const loadProjectContext = useCallback(async () => {
    if (!projectPath) return;

    try {
      const context = await invoke<ProjectContext>("scan_project_context", {
        cwd: projectPath,
        forceRefresh: false,
      });
      setProjectContext(context);
    } catch (err) {
      console.error("Failed to scan project context:", err);
    }
  }, [invoke, projectPath]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadAssistants(), loadProjectContext()]);
      setIsLoading(false);
    };
    load();
  }, [loadAssistants, loadProjectContext]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAssistants(), loadProjectContext()]);
    setRefreshing(false);
  }, [loadAssistants, loadProjectContext]);

  const handleLaunchAssistant = async (assistant: Assistant) => {
    if (!projectPath) return;

    try {
      await spawnTerminal(projectPath, assistant.command || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Launched", `${assistant.name} started in a new terminal`);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to launch assistant"
      );
    }
  };

  const handleGenerateCommand = async () => {
    if (!aiInput.trim()) return;

    setIsGenerating(true);
    setGeneratedCommand(null);

    try {
      const result = await invoke<{ command: string }>("ai_shell_command", {
        description: aiInput,
        projectContext,
      });

      setGeneratedCommand(result.command);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to generate command"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunCommand = async () => {
    if (!generatedCommand || !projectPath) return;

    try {
      await spawnTerminal(projectPath, generatedCommand);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAiInput("");
      setGeneratedCommand(null);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to run command"
      );
    }
  };

  if (!activeProject) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-muted-foreground text-center">
          No project selected. Please select a project on your desktop.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
        />
      }
    >
      {/* Smart Shell */}
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center">
            <Wand2 size={18} color="#a78bfa" />
            <CardTitle className="ml-2">Smart Shell</CardTitle>
          </View>
          <CardDescription>
            Describe what you want to do in natural language
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextInput
            className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-foreground"
            placeholder="e.g., 'run tests for the auth module'"
            placeholderTextColor="#666"
            value={aiInput}
            onChangeText={setAiInput}
            multiline
            textAlignVertical="top"
          />

          {generatedCommand && (
            <View className="mt-4 p-3 rounded-md bg-secondary">
              <Text className="text-muted-foreground text-xs mb-1">
                Generated command:
              </Text>
              <Text className="text-foreground font-mono">
                $ {generatedCommand}
              </Text>
            </View>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            variant="outline"
            onPress={handleGenerateCommand}
            loading={isGenerating}
            disabled={!aiInput.trim()}
            icon={<Sparkles size={16} color="#a78bfa" />}
            className="flex-1"
          >
            Generate
          </Button>
          {generatedCommand && (
            <Button
              onPress={handleRunCommand}
              icon={<Play size={16} color="#000" />}
              className="flex-1"
            >
              Run
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Project Context */}
      {projectContext && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Project Context</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-2">
              {projectContext.projectType && (
                <Badge variant="secondary">{projectContext.projectType}</Badge>
              )}
              {projectContext.packageManager && (
                <Badge variant="outline">{projectContext.packageManager}</Badge>
              )}
              {projectContext.hasDocker && <Badge variant="outline">Docker</Badge>}
              {projectContext.hasMakefile && (
                <Badge variant="outline">Makefile</Badge>
              )}
            </View>

            {projectContext.scripts && projectContext.scripts.length > 0 && (
              <View className="mt-4">
                <Text className="text-muted-foreground text-sm mb-2">
                  Available scripts:
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {projectContext.scripts.slice(0, 8).map((script) => (
                    <Badge key={script} variant="outline">
                      {script}
                    </Badge>
                  ))}
                  {projectContext.scripts.length > 8 && (
                    <Badge variant="secondary">
                      +{projectContext.scripts.length - 8} more
                    </Badge>
                  )}
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Assistants */}
      <Card>
        <CardHeader>
          <View className="flex-row items-center">
            <Bot size={18} color="#60a5fa" />
            <CardTitle className="ml-2">AI Assistants</CardTitle>
          </View>
          <CardDescription>
            Launch coding assistants in the terminal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="items-center py-8">
              <Text className="text-muted-foreground">
                Loading assistants...
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {assistants.map((assistant) => (
                <View
                  key={assistant.id}
                  className="flex-row items-center justify-between p-3 rounded-md border border-border"
                >
                  <View className="flex-row items-center">
                    {assistant.id === "shell" ? (
                      <Terminal size={20} color="#22c55e" />
                    ) : (
                      <Bot size={20} color="#60a5fa" />
                    )}
                    <View className="ml-3">
                      <Text className="text-foreground font-medium">
                        {assistant.name}
                      </Text>
                      {assistant.command && (
                        <Text className="text-muted-foreground text-xs font-mono">
                          {assistant.command}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {assistant.installed ? (
                      <Badge variant="success">
                        <Check size={10} color="#fff" />
                        <Text className="text-white ml-1 text-xs">
                          Installed
                        </Text>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X size={10} color="#666" />
                        <Text className="text-muted-foreground ml-1 text-xs">
                          Not found
                        </Text>
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => handleLaunchAssistant(assistant)}
                      disabled={!assistant.installed}
                      icon={<Play size={14} color="#22c55e" />}
                    >
                      Launch
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
