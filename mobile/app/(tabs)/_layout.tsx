import { Tabs, router } from "expo-router";
import { GitBranch, Terminal, Bot, Home, Settings, ChevronDown, ArrowUp, ArrowDown } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/components/ThemeProvider";
import { useConnectionStore } from "~/stores/connectionStore";
import { useGitStore } from "~/stores/gitStore";
import { Pressable, View, Text } from "react-native";
import { s } from "~/lib/scale";

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { status: gitStatus, toggleBranchPicker } = useGitStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: s(62) + insets.bottom,
          paddingTop: s(8),
          paddingBottom: s(8) + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarLabelPosition: "below-icon",
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: s(11),
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Git",
          tabBarIcon: ({ color }) => (
            <GitBranch size={s(22)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Assistant",
          tabBarIcon: ({ color }) => <Bot size={s(22)} color={color} />,
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: "Terminal",
          tabBarIcon: ({ color }) => (
            <Terminal size={s(22)} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
