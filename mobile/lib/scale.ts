import { Dimensions } from "react-native";

// Some devices report a much wider dp viewport than a typical phone — e.g. the
// Unihertz Titan 2's square 1440px screen with a lowered density override
// resolves to ~700dp wide, so a 400dp-designed layout renders physically tiny.
// Scale the design system up proportionally, capped so tablets don't balloon.
const BASELINE_WIDTH = 560;

const { width, height } = Dimensions.get("window");
const shortestSide = Math.min(width, height);

export const uiScale = Math.min(Math.max(shortestSide / BASELINE_WIDTH, 1), 1.5);

// Scale a fixed dp size (icon sizes, hit targets) by the global UI scale.
export const s = (n: number) => Math.round(n * uiScale);
