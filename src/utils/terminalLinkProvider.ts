import type { ILinkProvider, ILink, Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";

/**
 * Performant file path link provider for xterm.js
 *
 * Design principles for performance:
 * 1. On-demand processing - only parses lines when user hovers (not during typing)
 * 2. LRU cache - avoids re-parsing frequently viewed lines
 * 3. Efficient regex - single pass, optimized pattern
 * 4. Lazy cache invalidation - only clears on significant buffer changes
 */

// LRU cache for parsed line results
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

interface CachedLink {
  startIndex: number;
  endIndex: number;
  text: string;
  path: string;
  line?: number;
  column?: number;
}

interface ParsedLineResult {
  lineContent: string;
  links: CachedLink[];
}

// Common file extensions - kept as a set for O(1) lookup
const FILE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json",
  // Web
  "html", "htm", "css", "scss", "sass", "less", "svg",
  // Config
  "yaml", "yml", "toml", "xml", "ini", "conf", "cfg", "env",
  // Documentation
  "md", "txt", "rst",
  // Programming languages
  "py", "rb", "rs", "go", "java", "kt", "swift", "c", "cpp", "h", "hpp",
  "cs", "php", "lua", "vim", "sh", "bash", "zsh", "fish",
  // Framework specific
  "vue", "svelte", "astro", "prisma",
  // Data
  "sql", "graphql", "gql", "proto", "csv",
  // Erlang/Elixir
  "ex", "exs", "erl", "hrl",
  // Build/Config
  "lock", "log", "make", "cmake", "dockerfile", "tf", "hcl",
]);

// Paths to skip - checked with startsWith or includes
const SKIP_PATH_SEGMENTS = [
  "node_modules",
  ".git/",
  "__pycache__",
  ".next/",
  ".nuxt/",
];

/**
 * Regex pattern for detecting file paths in terminal output.
 *
 * Captures:
 * - Group 1: The full path with optional line:col
 * - Group 2: The file path portion
 * - Group 3: Optional line number
 * - Group 4: Optional column number
 */
const FILE_PATH_REGEX = /(?:^|[\s'"({\[,;:>`])(((?:\.\.?\/)?(?:[\w.-]+\/)*[\w.-]+\.[a-zA-Z0-9]+)(?::(\d+)(?::(\d+))?)?)/g;

export class FilePathLinkProvider implements ILinkProvider {
  private cache: LRUCache<number, ParsedLineResult>;
  private terminal: Terminal;
  private cwd: string;
  private lastBufferLength = 0;
  private writeCount = 0;

  constructor(terminal: Terminal, cwd: string, cacheSize = 100) {
    this.terminal = terminal;
    this.cwd = cwd;
    this.cache = new LRUCache(cacheSize);

    // Invalidate cache periodically on writes, not on every write
    // This batches invalidation to reduce overhead
    terminal.onWriteParsed(() => {
      this.writeCount++;
      // Only check buffer length every 10 writes
      if (this.writeCount % 10 === 0) {
        const currentLength = terminal.buffer.active.length;
        // Clear cache if buffer changed significantly (batch output or clear)
        if (Math.abs(currentLength - this.lastBufferLength) > 50) {
          this.cache.clear();
        }
        this.lastBufferLength = currentLength;
      }
    });
  }

  /**
   * Called by xterm when user hovers over a line.
   * This is the key to performance - it's NOT called during typing.
   */
  provideLinks(
    bufferLineNumber: number,
    callback: (links: ILink[] | undefined) => void
  ): void {
    const buffer = this.terminal.buffer.active;
    const line = buffer.getLine(bufferLineNumber);

    if (!line) {
      callback(undefined);
      return;
    }

    const lineContent = line.translateToString(true);

    // Skip empty lines
    if (!lineContent.trim()) {
      callback(undefined);
      return;
    }

    // Check cache first
    const cached = this.cache.get(bufferLineNumber);
    if (cached && cached.lineContent === lineContent) {
      callback(this.createLinks(cached.links, bufferLineNumber));
      return;
    }

    // Parse the line for file paths
    const links = this.parseLine(lineContent);

    // Cache the result
    this.cache.set(bufferLineNumber, { lineContent, links });

    callback(this.createLinks(links, bufferLineNumber));
  }

  private parseLine(lineContent: string): CachedLink[] {
    const links: CachedLink[] = [];

    // Skip very long lines (likely binary/minified content)
    if (lineContent.length > 1000) {
      return links;
    }

    // Reset regex state
    FILE_PATH_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = FILE_PATH_REGEX.exec(lineContent)) !== null) {
      const fullMatch = match[1]; // The path with optional :line:col
      const filePath = match[2];  // Just the file path
      const lineNum = match[3] ? parseInt(match[3], 10) : undefined;
      const colNum = match[4] ? parseInt(match[4], 10) : undefined;

      // Validate file extension
      const ext = filePath.split(".").pop()?.toLowerCase();
      if (!ext || !FILE_EXTENSIONS.has(ext)) {
        continue;
      }

      // Skip paths containing excluded segments
      if (SKIP_PATH_SEGMENTS.some(seg => filePath.includes(seg))) {
        continue;
      }

      // Calculate the actual start position in the line
      // match.index is where the full regex matched (including leading char)
      // We need to find where fullMatch actually starts
      const matchStart = lineContent.indexOf(fullMatch, match.index);
      if (matchStart === -1) continue;

      links.push({
        startIndex: matchStart,
        endIndex: matchStart + fullMatch.length,
        text: fullMatch,
        path: filePath,
        line: lineNum,
        column: colNum,
      });

      // Safety limit: max 10 links per line
      if (links.length >= 10) break;
    }

    return links;
  }

  private createLinks(cachedLinks: CachedLink[], bufferLineNumber: number): ILink[] {
    return cachedLinks.map(cached => ({
      range: {
        start: { x: cached.startIndex + 1, y: bufferLineNumber },
        end: { x: cached.endIndex + 1, y: bufferLineNumber },
      },
      text: cached.text,
      activate: (event: MouseEvent, _text: string) => {
        // Require Cmd (Mac) or Ctrl (Windows/Linux) + Click to open
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
        if (modifierPressed) {
          this.handleLinkActivation(cached.path, cached.line, cached.column);
        }
      },
      hover: (event: MouseEvent, _text: string) => {
        // Show tooltip with Cmd/Ctrl+Click hint
        const target = event.target as HTMLElement;
        if (target) {
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const modifier = isMac ? '⌘' : 'Ctrl';
          target.title = `${modifier}+Click to open`;
        }
      },
    }));
  }

  private handleLinkActivation(
    path: string,
    line?: number,
    column?: number
  ): void {
    // Resolve relative paths against cwd
    const fullPath = path.startsWith('/') ? path : `${this.cwd}/${path}`;

    // Try to open in editor with line/column support
    invoke("open_file_in_editor", {
      path: fullPath,
      line: line ?? null,
      column: column ?? null,
    }).catch((err) => {
      console.error("Failed to open file in editor:", err);
      // Fallback: reveal in file manager
      invoke("reveal_in_file_manager", { path: fullPath }).catch(console.error);
    });
  }

  /**
   * Update the working directory (e.g., when user cd's)
   */
  setCwd(cwd: string): void {
    this.cwd = cwd;
  }

  /**
   * Force cache clear (e.g., on terminal clear)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
