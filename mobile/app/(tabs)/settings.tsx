import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
  Modal,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  Wifi,
  WifiOff,
  QrCode,
  Check,
  X,
  Trash2,
  Monitor,
  ChevronRight,
  Camera,
  Palette,
  Moon,
  Sun,
  Sparkles,
  Info,
} from "lucide-react-native";
import { useConnectionStore, LinkedPortal } from "~/stores/connectionStore";
import { useThemeStore, ThemeOption } from "~/stores/themeStore";
import { useTheme } from "~/components/ThemeProvider";
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

export default function SettingsTabPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    status,
    error,
    linkedPortals,
    activePortalId,
    desktopDeviceName,
    pairFromQR,
    selectPortal,
    removePortal,
    disconnect,
  } = useConnectionStore();

  const { theme, setTheme, syncWithDesktop, setSyncWithDesktop } = useThemeStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const isConnected = status === "connected";

  const handleScanQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan QR codes"
        );
        return;
      }
    }
    setShowScanner(true);
    setIsScanning(false);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      await pairFromQR(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowScanner(false);
      Alert.alert("Success", "Connected to desktop!");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Connection Failed",
        err instanceof Error ? err.message : "Failed to connect"
      );
      setIsScanning(false);
    }
  };

  const handleSelectPortal = async (portal: LinkedPortal) => {
    if (portal.id === activePortalId && isConnected) return;

    try {
      await selectPortal(portal.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert(
        "Connection Failed",
        err instanceof Error ? err.message : "Failed to connect"
      );
    }
  };

  const handleRemovePortal = (portal: LinkedPortal) => {
    Alert.alert(
      "Remove Desktop",
      `Are you sure you want to remove "${portal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removePortal(portal.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert("Disconnect", "Are you sure you want to disconnect?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => {
          disconnect();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const themes: { id: ThemeOption; name: string; icon: typeof Sun }[] = [
    { id: "dark", name: "Dark", icon: Moon },
    { id: "tokyo", name: "Tokyo Night", icon: Sparkles },
    { id: "light", name: "Light", icon: Sun },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Connection Status */}
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {isConnected ? (
                <Wifi size={18} color="#22c55e" />
              ) : (
                <WifiOff size={18} color="#ef4444" />
              )}
              <CardTitle className="ml-2">Connection</CardTitle>
            </View>
            <Badge
              variant={
                isConnected
                  ? "success"
                  : status === "connecting" || status === "pairing"
                  ? "warning"
                  : "destructive"
              }
            >
              {status}
            </Badge>
          </View>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <View className="gap-2">
              <View className="flex-row items-center">
                <Check size={16} color="#22c55e" />
                <Text className="text-foreground ml-2">
                  Connected to {desktopDeviceName || "Desktop"}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-muted-foreground">Not connected</Text>
          )}
          {error && (
            <View className="flex-row items-center mt-2">
              <X size={16} color="#ef4444" />
              <Text className="text-destructive ml-2">{error}</Text>
            </View>
          )}
        </CardContent>
        {isConnected && (
          <CardFooter>
            <Button variant="destructive" onPress={handleDisconnect}>
              Disconnect
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Scan QR Code */}
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center">
            <QrCode size={18} color="#a78bfa" />
            <CardTitle className="ml-2">Add Desktop</CardTitle>
          </View>
          <CardDescription>
            Scan the QR code shown in Chell Desktop settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onPress={handleScanQR}
            icon={<Camera size={18} color="#000" />}
          >
            Scan QR Code
          </Button>
        </CardContent>
      </Card>

      {/* Linked Desktops */}
      {linkedPortals.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center">
              <Monitor size={18} color="#60a5fa" />
              <CardTitle className="ml-2">
                Linked Desktops ({linkedPortals.length})
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <View className="gap-2">
              {linkedPortals.map((portal) => (
                <Pressable
                  key={portal.id}
                  className={`flex-row items-center justify-between p-3 rounded-lg border ${
                    portal.id === activePortalId && isConnected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onPress={() => handleSelectPortal(portal)}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`w-10 h-10 rounded-lg items-center justify-center ${
                        portal.isOnline ? "bg-green-500/10" : "bg-muted"
                      }`}
                    >
                      <Monitor
                        size={20}
                        color={portal.isOnline ? "#22c55e" : colors.mutedForeground}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-foreground font-medium">
                          {portal.name}
                        </Text>
                        {portal.id === activePortalId && isConnected && (
                          <Badge variant="success">Active</Badge>
                        )}
                      </View>
                      <Text className="text-muted-foreground text-xs">
                        {portal.isOnline ? "Online" : "Offline"} • Last seen{" "}
                        {formatDate(portal.lastSeen)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="p-2"
                      onPress={() => handleRemovePortal(portal)}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </Pressable>
                    {(portal.id !== activePortalId || !isConnected) && (
                      <ChevronRight size={18} color={colors.mutedForeground} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </CardContent>
        </Card>
      )}

      {/* Theme Settings */}
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center">
            <Palette size={18} color="#a78bfa" />
            <CardTitle className="ml-2">Theme</CardTitle>
          </View>
        </CardHeader>
        <CardContent>
          {/* Theme Options */}
          <View className="gap-2 mb-4">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;

              return (
                <Pressable
                  key={t.id}
                  className={`flex-row items-center justify-between p-3 rounded-lg border ${
                    isActive ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onPress={() => handleThemeChange(t.id)}
                >
                  <View className="flex-row items-center">
                    <Icon size={18} color={isActive ? colors.primary : colors.mutedForeground} />
                    <Text
                      className={`ml-3 ${
                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {t.name}
                    </Text>
                  </View>
                  {isActive && <Check size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>

          <Separator className="my-4" />

          {/* Sync with Desktop */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-foreground font-medium">
                Sync with Desktop
              </Text>
              <Text className="text-muted-foreground text-sm">
                Automatically match desktop theme
              </Text>
            </View>
            <Switch
              value={syncWithDesktop}
              onValueChange={(value) => {
                setSyncWithDesktop(value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <View className="flex-row items-center">
            <Info size={18} color="#60a5fa" />
            <CardTitle className="ml-2">About</CardTitle>
          </View>
        </CardHeader>
        <CardContent>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">App</Text>
              <Text className="text-foreground">Chell Portal</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground">Version</Text>
              <Text className="text-foreground">1.0.0</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View className="flex-1 bg-black">
          <CameraView
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
          />

          {/* Scanner overlay */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-64 h-64 border-2 border-white rounded-2xl" />
            <Text className="text-white text-center mt-8 px-8">
              Point your camera at the QR code in Chell Desktop settings
            </Text>
          </View>

          {/* Close button */}
          <View className="absolute top-16 left-4">
            <Pressable
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              onPress={() => setShowScanner(false)}
            >
              <X size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Scanning indicator */}
          {isScanning && (
            <View className="absolute inset-0 items-center justify-center bg-black/50">
              <Text className="text-white text-lg">Connecting...</Text>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
