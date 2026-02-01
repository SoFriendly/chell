import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "./ThemeProvider";

interface ChellLogoProps {
  size?: number;
  color?: string;
}

export default function ChellLogo({ size = 32, color }: ChellLogoProps) {
  const { colors } = useTheme();
  const fillColor = color || colors.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Terminal prompt > on the left */}
      <Path
        d="M3 11L9 16L3 21"
        stroke={fillColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 4 nodes forming a C shape */}
      <Circle cx="26" cy="7" r="3" fill={fillColor} />
      <Circle cx="18" cy="11" r="3" fill={fillColor} />
      <Circle cx="18" cy="21" r="3" fill={fillColor} />
      <Circle cx="26" cy="25" r="3" fill={fillColor} />
    </Svg>
  );
}
