import { convertFileSrc } from "@tauri-apps/api/core";

// Resolve an image src from rendered markdown into something the webview can load.
// Remote/data/blob/asset URLs pass through untouched; relative or absolute local
// paths are resolved against the markdown file's directory and converted to an
// asset:// URL (Tauri assetProtocol must be enabled).
export function resolveMarkdownImageSrc(
  src: string | undefined,
  mdPath: string
): string | undefined {
  if (!src) return src;
  if (/^(https?|data|blob|asset):/i.test(src) || src.startsWith("asset://")) {
    return src;
  }

  const dir = mdPath.slice(0, mdPath.lastIndexOf("/"));
  // Build an absolute path: keep leading "/" as-is, otherwise join with the dir.
  const combined = src.startsWith("/") ? src : `${dir}/${src}`;
  // Normalize "." and ".." segments.
  const segments: string[] = [];
  for (const part of combined.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  const absolute = "/" + segments.join("/");
  return convertFileSrc(absolute);
}
