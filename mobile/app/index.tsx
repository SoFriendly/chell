import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Wifi,
  WifiOff,
  GitBranch,
  Terminal,
  Bot,
  ChevronRight,
  Settings,
} from "lucide-react-native";
import { useConnectionStore } from "~/stores/connectionStore";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from "~/components/ui";

export default function HomePage() {
  const router = useRouter();
  const { status, activeProject, gitStatus, error } = useConnectionStore();
  const [refreshing, setRefreshing] = useState(false);

  const isConnected = status === "connected";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Trigger a status refresh from desktop
    // This would be handled by the connection store
    setRefreshing(false);
  }, []);

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
      {/* Connection Status */}
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {isConnected ? (
                <Wifi size={20} color="#22c55e" />
              ) : (
                <WifiOff size={20} color="#ef4444" />
              )}
              <CardTitle className="ml-2">
                {isConnected ? "Connected" : "Disconnected"}
              </CardTitle>
            </View>
            <Badge variant={isConnected ? "success" : "destructive"}>
              {status}
            </Badge>
          </View>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            activeProject ? (
              <View>
                <Text className="text-foreground font-medium">
                  {activeProject.name}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {activeProject.path}
                </Text>
              </View>
            ) : (
              <Text className="text-muted-foreground">
                No project selected on desktop
              </Text>
            )
          ) : (
            <View>
              <Text className="text-muted-foreground mb-3">
                Connect to your desktop Chell app to get started
              </Text>
              <Button onPress={() => router.push("/connect")}>
                Connect to Desktop
              </Button>
            </View>
          )}
          {error && (
            <Text className="text-destructive mt-2 text-sm">{error}</Text>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {isConnected && activeProject && (
        <>
          {/* Git Status Summary */}
          {gitStatus && (
            <Card className="mb-4">
              <CardHeader>
                <View className="flex-row items-center">
                  <GitBranch size={18} color="#a78bfa" />
                  <CardTitle className="ml-2">{gitStatus.branch}</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                <View className="flex-row gap-4">
                  {gitStatus.staged.length > 0 && (
                    <Badge variant="success">
                      {gitStatus.staged.length} staged
                    </Badge>
                  )}
                  {gitStatus.unstaged.length > 0 && (
                    <Badge variant="warning">
                      {gitStatus.unstaged.length} modified
                    </Badge>
                  )}
                  {gitStatus.untracked.length > 0 && (
                    <Badge variant="secondary">
                      {gitStatus.untracked.length} untracked
                    </Badge>
                  )}
                  {gitStatus.ahead > 0 && (
                    <Badge variant="outline">{gitStatus.ahead} ahead</Badge>
                  )}
                  {gitStatus.behind > 0 && (
                    <Badge variant="outline">{gitStatus.behind} behind</Badge>
                  )}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Navigation Cards */}
          <View className="gap-3">
            <Button
              variant="outline"
              className="h-16 justify-between"
              onPress={() => router.push("/project/git")}
            >
              <View className="flex-row items-center">
                <GitBranch size={20} color="#a78bfa" />
                <Text className="text-foreground ml-3 text-base font-medium">
                  Git Panel
                </Text>
              </View>
              <ChevronRight size={20} color="#666" />
            </Button>

            <Button
              variant="outline"
              className="h-16 justify-between"
              onPress={() => router.push("/project/terminal")}
            >
              <View className="flex-row items-center">
                <Terminal size={20} color="#22c55e" />
                <Text className="text-foreground ml-3 text-base font-medium">
                  Terminal
                </Text>
              </View>
              <ChevronRight size={20} color="#666" />
            </Button>

            <Button
              variant="outline"
              className="h-16 justify-between"
              onPress={() => router.push("/project/assistant")}
            >
              <View className="flex-row items-center">
                <Bot size={20} color="#60a5fa" />
                <Text className="text-foreground ml-3 text-base font-medium">
                  AI Assistant
                </Text>
              </View>
              <ChevronRight size={20} color="#666" />
            </Button>
          </View>
        </>
      )}

      {/* Settings */}
      <Button
        variant="ghost"
        className="mt-6"
        onPress={() => router.push("/connect")}
        icon={<Settings size={18} color="#666" />}
      >
        <Text className="text-muted-foreground">Connection Settings</Text>
      </Button>
    </ScrollView>
  );
}
