import { Stack } from "expo-router";

export default function ProjectLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0d0d0d",
        },
        headerTintColor: "#fff",
        contentStyle: {
          backgroundColor: "#0d0d0d",
        },
      }}
    >
      <Stack.Screen
        name="git"
        options={{
          title: "Git Panel",
        }}
      />
      <Stack.Screen
        name="terminal"
        options={{
          title: "Terminal",
        }}
      />
      <Stack.Screen
        name="assistant"
        options={{
          title: "AI Assistant",
        }}
      />
    </Stack>
  );
}
