import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Plus, X, Terminal as TerminalIcon, Send } from "lucide-react-native";
import { useConnectionStore } from "~/stores/connectionStore";
import { useTerminalStore } from "~/stores/terminalStore";
import { Button, Card, CardContent, Badge } from "~/components/ui";

export default function TerminalPage() {
  const { activeProject } = useConnectionStore();
  const {
    terminals,
    activeTerminalId,
    spawnTerminal,
    killTerminal,
    setActiveTerminal,
    sendInput,
    getOutput,
  } = useTerminalStore();

  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const projectPath = activeProject?.path || "";
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);
  const output = activeTerminalId ? getOutput(activeTerminalId) : [];

  // Spawn initial terminal if none exists
  useEffect(() => {
    if (projectPath && terminals.length === 0) {
      spawnTerminal(projectPath);
    }
  }, [projectPath]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [output]);

  const handleNewTerminal = async () => {
    if (!projectPath) return;
    await spawnTerminal(projectPath);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCloseTerminal = async (terminalId: string) => {
    await killTerminal(terminalId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSend = useCallback(() => {
    if (!activeTerminalId || !input.trim()) return;

    // Add to history
    if (input.trim()) {
      setCommandHistory((prev) => [...prev.slice(-50), input]);
      setHistoryIndex(-1);
    }

    // Send command with newline
    sendInput(activeTerminalId, input + "\n");
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [activeTerminalId, input, sendInput]);

  const handleHistoryUp = useCallback(() => {
    if (commandHistory.length === 0) return;

    const newIndex =
      historyIndex === -1
        ? commandHistory.length - 1
        : Math.max(0, historyIndex - 1);

    setHistoryIndex(newIndex);
    setInput(commandHistory[newIndex]);
  }, [commandHistory, historyIndex]);

  const handleHistoryDown = useCallback(() => {
    if (historyIndex === -1) return;

    const newIndex = historyIndex + 1;
    if (newIndex >= commandHistory.length) {
      setHistoryIndex(-1);
      setInput("");
    } else {
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
    }
  }, [commandHistory, historyIndex]);

  const handleCtrlC = useCallback(() => {
    if (!activeTerminalId) return;
    sendInput(activeTerminalId, "\x03");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [activeTerminalId, sendInput]);

  const handleTab = useCallback(() => {
    if (!activeTerminalId) return;
    sendInput(activeTerminalId, "\t");
  }, [activeTerminalId, sendInput]);

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
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      {/* Terminal Tabs */}
      <View className="flex-row items-center border-b border-border p-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
        >
          {terminals.map((terminal) => (
            <Pressable
              key={terminal.id}
              className={`flex-row items-center mr-2 px-3 py-1.5 rounded-md ${
                terminal.id === activeTerminalId
                  ? "bg-secondary"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTerminal(terminal.id)}
            >
              <TerminalIcon
                size={14}
                color={terminal.id === activeTerminalId ? "#22c55e" : "#666"}
              />
              <Text
                className={`ml-2 text-sm ${
                  terminal.id === activeTerminalId
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {terminal.title}
              </Text>
              <Pressable
                className="ml-2 p-1"
                onPress={() => handleCloseTerminal(terminal.id)}
              >
                <X size={12} color="#666" />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
        <Button variant="ghost" size="icon" onPress={handleNewTerminal}>
          <Plus size={18} color="#fff" />
        </Button>
      </View>

      {/* Terminal Output */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-black p-2"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {output.length === 0 ? (
          <View className="items-center justify-center py-8">
            <TerminalIcon size={32} color="#333" />
            <Text className="text-gray-500 mt-4">Terminal ready</Text>
            <Text className="text-gray-600 text-sm mt-1">
              {activeTerminal?.cwd}
            </Text>
          </View>
        ) : (
          output.map((line, index) => (
            <Text
              key={index}
              className="text-green-400 font-mono text-sm leading-5"
              selectable
            >
              {line}
            </Text>
          ))
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View className="flex-row items-center border-t border-border bg-card px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          onPress={handleCtrlC}
          className="mr-1"
        >
          <Text className="text-destructive text-xs">^C</Text>
        </Button>
        <Button variant="ghost" size="sm" onPress={handleTab} className="mr-1">
          <Text className="text-muted-foreground text-xs">TAB</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onPress={handleHistoryUp}
          className="mr-1"
        >
          <Text className="text-muted-foreground text-xs">UP</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onPress={handleHistoryDown}
          className="mr-1"
        >
          <Text className="text-muted-foreground text-xs">DOWN</Text>
        </Button>
      </View>

      {/* Input */}
      <View className="flex-row items-center border-t border-border bg-card p-2">
        <Text className="text-green-400 font-mono mr-2">$</Text>
        <TextInput
          ref={inputRef}
          className="flex-1 h-10 text-foreground font-mono"
          value={input}
          onChangeText={setInput}
          placeholder="Enter command..."
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Button
          variant="ghost"
          size="icon"
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Send size={18} color={input.trim() ? "#22c55e" : "#666"} />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
