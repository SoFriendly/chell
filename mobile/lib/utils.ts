import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return "just now";
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Strip ANSI escape codes from terminal output
 * Handles colors, cursor movement, OSC sequences, and other terminal control sequences
 */
export function stripAnsi(str: string): string {
  // First pass: Remove OSC sequences (Operating System Commands)
  // Format: ESC ] <code> ; <data> BEL  or  ESC ] <code> ; <data> ESC \
  // These are used for terminal title, shell integration (133;A, 133;B, etc.)
  // Be aggressive - match anything after ESC ] until BEL, ST, or end of reasonable sequence
  let result = str.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B\][\x20-\x7E]*(?:\x07|\x1B\\)?/g,
    ""
  );

  // Also handle OSC sequences that might have non-printable data
  result = result.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B\][^\x07]*\x07/g,
    ""
  );

  // Second pass: Remove CSI sequences (Control Sequence Introducer)
  // Format: ESC [ <params> <command>
  result = result.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B\[[0-?]*[ -/]*[@-~]/g,
    ""
  );

  // Third pass: Remove other escape sequences
  // Single character escapes like ESC c (reset), ESC 7/8 (save/restore cursor)
  result = result.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B[@-Z\\-_]/g,
    ""
  );

  // Fourth pass: Remove DCS (Device Control String) sequences
  // Format: ESC P ... ST (where ST is ESC \)
  result = result.replace(
    // eslint-disable-next-line no-control-regex
    /\x1BP[^\x1B]*\x1B\\/g,
    ""
  );

  // Fifth pass: Remove APC (Application Program Command) sequences
  // Format: ESC _ ... ST
  result = result.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B_[^\x1B]*\x1B\\/g,
    ""
  );

  // Sixth pass: Remove any remaining control characters except newline/tab/carriage return
  result = result.replace(
    // eslint-disable-next-line no-control-regex
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    ""
  );

  return result;
}
