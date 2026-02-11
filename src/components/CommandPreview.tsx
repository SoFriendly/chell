import { useState } from "react";
import { Check, Copy, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommandPreviewProps {
  command: string;
  explanation?: string;
  onExecute: () => void;
  onCancel: () => void;
  className?: string;
}

export default function CommandPreview({
  command,
  explanation,
  onExecute,
  onCancel,
  className,
}: CommandPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/50 p-3",
        className
      )}
    >
      {/* Top row: keyboard hints and close */}
      <div className="flex items-center mb-2">
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded bg-muted px-1">Enter</kbd> to execute,{" "}
          <kbd className="rounded bg-muted px-1">Esc</kbd> to cancel
        </p>
        <button
          onClick={onCancel}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Command display with copy icon */}
      <div className="flex items-center mb-2 rounded bg-background px-2 py-1.5">
        <code className="flex-1 font-mono text-sm text-foreground">
          {command}
        </code>
        <button
          onClick={handleCopy}
          className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="mb-2 text-xs text-muted-foreground">{explanation}</p>
      )}

      {/* Execute button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onExecute}
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Execute
        </Button>
      </div>
    </div>
  );
}
