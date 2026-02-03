import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

// 25 seconds at 30fps = 750 frames
// With TransitionSeries: (105 + 150 + 150 + 150 + 150 + 105) - (5 * 12) = 750 frames
const DURATION_IN_FRAMES = 750;
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChellLaunchVideo"
        component={MyComposition}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
