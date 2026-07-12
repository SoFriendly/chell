const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("txt");

// inlineRem: false keeps rem units runtime-resolved so the global UI scale
// (rem.set in app/_layout.tsx) actually applies; the default inlines px.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: false });
