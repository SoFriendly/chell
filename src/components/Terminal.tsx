import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm, ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "@/stores/settingsStore";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  id?: string;  // Optional - if not provided, Terminal will spawn its own
  command?: string;  // Command to run (empty for default shell)
  cwd: string;
  onTerminalReady?: (terminalId: string) => void;  // Called when terminal is spawned
}

// Terminal themes matching app themes
const TERMINAL_THEMES: Record<string, ITheme> = {
  dark: {
    background: "#0d0d0d",
    foreground: "#e0e0e0",
    cursor: "#FF6B00",
    cursorAccent: "#0d0d0d",
    selectionBackground: "#FF6B0040",
    black: "#000000",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#6272a4",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#f8f8f2",
    brightBlack: "#6272a4",
    brightRed: "#ff6e6e",
    brightGreen: "#69ff94",
    brightYellow: "#ffffa5",
    brightBlue: "#d6acff",
    brightMagenta: "#ff92df",
    brightCyan: "#a4ffff",
    brightWhite: "#ffffff",
  },
  tokyo: {
    background: "#1a1b26",
    foreground: "#c0caf5",
    cursor: "#7aa2f7",
    cursorAccent: "#1a1b26",
    selectionBackground: "#7aa2f740",
    black: "#15161e",
    red: "#f7768e",
    green: "#9ece6a",
    yellow: "#e0af68",
    blue: "#7aa2f7",
    magenta: "#bb9af7",
    cyan: "#7dcfff",
    white: "#a9b1d6",
    brightBlack: "#414868",
    brightRed: "#f7768e",
    brightGreen: "#9ece6a",
    brightYellow: "#e0af68",
    brightBlue: "#7aa2f7",
    brightMagenta: "#bb9af7",
    brightCyan: "#7dcfff",
    brightWhite: "#c0caf5",
  },
  light: {
    background: "#fafafa",
    foreground: "#383a42",
    cursor: "#526eff",
    cursorAccent: "#fafafa",
    selectionBackground: "#526eff30",
    black: "#383a42",
    red: "#e45649",
    green: "#50a14f",
    yellow: "#c18401",
    blue: "#4078f2",
    magenta: "#a626a4",
    cyan: "#0184bc",
    white: "#fafafa",
    brightBlack: "#a0a1a7",
    brightRed: "#e06c75",
    brightGreen: "#98c379",
    brightYellow: "#d19a66",
    brightBlue: "#61afef",
    brightMagenta: "#c678dd",
    brightCyan: "#56b6c2",
    brightWhite: "#ffffff",
  },
};

export default function Terminal({ id, command = "", cwd, onTerminalReady }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [terminalId, setTerminalId] = useState<string | null>(id || null);
  const [initialDimensions, setInitialDimensions] = useState<{ cols: number; rows: number } | null>(null);
  const theme = useSettingsStore((state) => state.theme);
  const hasSpawnedRef = useRef(false);

  // Phase 1: Wait for container to have stable dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    let lastWidth = 0;
    let lastHeight = 0;
    let stableCount = 0;
    let stabilityTimer: ReturnType<typeof setTimeout> | null = null;

    const checkStability = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;

      if (width > 0 && height > 0) {
        if (width === lastWidth && height === lastHeight) {
          stableCount++;
          // Require dimensions to be stable for 3 consecutive checks (150ms)
          if (stableCount >= 3) {
            setIsContainerReady(true);
            return;
          }
        } else {
          stableCount = 0;
          lastWidth = width;
          lastHeight = height;
        }
      }

      stabilityTimer = setTimeout(checkStability, 50);
    };

    // Start checking after a short initial delay to let layout begin
    stabilityTimer = setTimeout(checkStability, 50);

    return () => {
      if (stabilityTimer) clearTimeout(stabilityTimer);
    };
  }, []);

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = TERMINAL_THEMES[theme] || TERMINAL_THEMES.dark;
    }
  }, [theme]);

  // Phase 2: Create xterm and calculate dimensions (but don't connect to PTY yet)
  useEffect(() => {
    if (!containerRef.current || !isContainerReady || terminalRef.current) return;

    const terminal = new XTerm({
      theme: TERMINAL_THEMES[theme] || TERMINAL_THEMES.dark,
      fontFamily: '"MesloLGS NF", "Hack Nerd Font", "FiraCode Nerd Font", "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "bar",
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = "11";

    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle macOS keyboard shortcuts
    terminal.attachCustomKeyEventHandler((event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      if (isMac && event.type === 'keydown') {
        // Cmd+Backspace: Delete line (send Ctrl+U)
        if (event.metaKey && event.key === 'Backspace') {
          terminal.input('\x15'); // Ctrl+U
          return false;
        }
        // Cmd+Left: Beginning of line (send Ctrl+A)
        if (event.metaKey && event.key === 'ArrowLeft') {
          terminal.input('\x01'); // Ctrl+A
          return false;
        }
        // Cmd+Right: End of line (send Ctrl+E)
        if (event.metaKey && event.key === 'ArrowRight') {
          terminal.input('\x05'); // Ctrl+E
          return false;
        }
        // Option+Backspace: Delete word (send Ctrl+W)
        if (event.altKey && event.key === 'Backspace') {
          terminal.input('\x17'); // Ctrl+W
          return false;
        }
        // Option+Left: Move word left (send ESC+b)
        if (event.altKey && event.key === 'ArrowLeft') {
          terminal.input('\x1bb'); // ESC+b
          return false;
        }
        // Option+Right: Move word right (send ESC+f)
        if (event.altKey && event.key === 'ArrowRight') {
          terminal.input('\x1bf'); // ESC+f
          return false;
        }
        // Cmd+K: Clear screen
        if (event.metaKey && event.key === 'k') {
          terminal.clear();
          return false;
        }
        // Allow Cmd+C, Cmd+V for copy/paste (let browser handle)
        if (event.metaKey && (event.key === 'c' || event.key === 'v')) {
          return true;
        }
      }

      return true;
    });

    // Do initial fit to calculate dimensions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          const { cols, rows } = terminal;
          setInitialDimensions({ cols, rows });
        } catch (e) {
          // Fallback dimensions
          setInitialDimensions({ cols: 80, rows: 24 });
        }
      });
    });

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [isContainerReady, theme]);

  // Phase 3: Spawn PTY with correct dimensions (only if not provided externally)
  useEffect(() => {
    if (!initialDimensions || hasSpawnedRef.current) return;
    if (id) {
      // Terminal ID was provided externally, use it
      setTerminalId(id);
      return;
    }

    hasSpawnedRef.current = true;

    const spawnTerminal = async () => {
      try {
        const newId = await invoke<string>("spawn_terminal", {
          shell: command,
          cwd,
          cols: initialDimensions.cols,
          rows: initialDimensions.rows,
        });
        setTerminalId(newId);
        onTerminalReady?.(newId);
      } catch (error) {
        console.error("Failed to spawn terminal:", error);
      }
    };

    spawnTerminal();
  }, [initialDimensions, id, command, cwd, onTerminalReady]);

  // Phase 4: Connect to PTY and handle ongoing resize
  useEffect(() => {
    if (!terminalId || !terminalRef.current || !fitAddonRef.current) return;

    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;

    // Safe fit function that checks if terminal is ready
    const safeFit = () => {
      try {
        if (containerRef.current && containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
          fitAddon.fit();
          const { cols, rows } = terminal;
          invoke("resize_terminal", { id: terminalId, cols, rows }).catch(console.error);
          return true;
        }
      } catch (e) {
        // Ignore fit errors
      }
      return false;
    };

    // Handle terminal input
    const dataDisposable = terminal.onData((data) => {
      invoke("write_terminal", { id: terminalId, data }).catch(console.error);
    });

    // Handle terminal resize
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      invoke("resize_terminal", { id: terminalId, cols, rows }).catch(console.error);
    });

    // Listen for terminal output from backend
    const unlisten = listen<string>(`terminal-output-${terminalId}`, (event) => {
      terminal.write(event.payload);
    });

    // Handle window resize
    const handleResize = () => {
      safeFit();
    };
    window.addEventListener("resize", handleResize);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          safeFit();
        }
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also handle visibility changes (for tabbed terminals)
    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setTimeout(() => safeFit(), 10);
        }
      }
    });
    if (containerRef.current) {
      intersectionObserver.observe(containerRef.current);
    }

    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      unlisten.then((fn) => fn());
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [terminalId]);

  // Focus terminal on click
  const handleClick = () => {
    terminalRef.current?.focus();
  };

  // Get background color from current theme
  const bgColor = TERMINAL_THEMES[theme]?.background || TERMINAL_THEMES.dark.background;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="h-full w-full p-1"
      style={{ backgroundColor: bgColor }}
    />
  );
}
