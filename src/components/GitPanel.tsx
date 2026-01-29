import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  GitCommit,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGitStore } from "@/stores/gitStore";
import { cn } from "@/lib/utils";
import type { FileDiff } from "@/types";

// Groq API key for AI commit messages
const GROQ_API_KEY = "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";

interface GitPanelProps {
  projectPath: string;
  onRefresh: () => void;
}

interface CommitSuggestion {
  subject: string;
  description: string;
}

export default function GitPanel({ projectPath, onRefresh }: GitPanelProps) {
  const { diffs, branches, loading } = useGitStore();
  const [commitSubject, setCommitSubject] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const lastDiffsHash = useRef<string>("");

  const currentBranch = branches.find((b) => b.isHead);

  // Separate staged and unstaged changes (for now, treating all as unstaged)
  const unstagedChanges = diffs;
  const stagedChanges: FileDiff[] = [];

  // Auto-generate commit message when diffs change
  useEffect(() => {
    const diffsHash = JSON.stringify(diffs.map(d => d.path + d.status));
    if (diffs.length > 0 && diffsHash !== lastDiffsHash.current) {
      lastDiffsHash.current = diffsHash;
      generateCommitMessage();
    } else if (diffs.length === 0) {
      setCommitSubject("");
      setCommitDescription("");
      lastDiffsHash.current = "";
    }
  }, [diffs]);

  const generateCommitMessage = async () => {
    if (diffs.length === 0) return;

    setIsGenerating(true);
    try {
      const suggestion = await invoke<CommitSuggestion>("generate_commit_message", {
        diffs,
        apiKey: GROQ_API_KEY,
      });
      setCommitSubject(suggestion.subject);
      setCommitDescription(suggestion.description);
    } catch (error) {
      console.error("Failed to generate commit message:", error);
      // Fallback to a simple message
      const fileNames = diffs.map(d => d.path.split('/').pop()).join(', ');
      setCommitSubject(`Update ${fileNames}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!commitSubject.trim()) {
      toast.error("Please enter a commit message");
      return;
    }
    setIsCommitting(true);
    try {
      const fullMessage = commitDescription.trim()
        ? `${commitSubject}\n\n${commitDescription}`
        : commitSubject;
      await invoke("commit", { repoPath: projectPath, message: fullMessage });
      toast.success("Changes committed");
      setCommitSubject("");
      setCommitDescription("");
      onRefresh();
    } catch (error) {
      toast.error("Failed to commit");
      console.error(error);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDiscardFile = async (filePath: string) => {
    try {
      await invoke("discard_file", { repoPath: projectPath, filePath });
      toast.success("Changes discarded");
      onRefresh();
    } catch (error) {
      toast.error("Failed to discard changes");
      console.error(error);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName) return;
    try {
      await invoke("create_branch", { repoPath: projectPath, name: newBranchName });
      toast.success(`Created branch ${newBranchName}`);
      setShowBranchDialog(false);
      setNewBranchName("");
      onRefresh();
    } catch (error) {
      toast.error("Failed to create branch");
      console.error(error);
    }
  };

  const toggleFileExpanded = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "bg-green-500";
      case "deleted":
        return "bg-red-500";
      default:
        return "bg-portal-orange";
    }
  };

  const FileItem = ({ diff }: { diff: FileDiff }) => (
    <div className="group">
      <div
        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
        onClick={() => toggleFileExpanded(diff.path)}
      >
        {expandedFiles.has(diff.path) ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className={cn("h-2 w-2 shrink-0 rounded-sm", getStatusColor(diff.status))} />
        <span className="flex-1 truncate font-mono text-xs">{diff.path}</span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard changes?</AlertDialogTitle>
              <AlertDialogDescription>
                This will discard all changes to {diff.path}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDiscardFile(diff.path)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Inline diff view */}
      {expandedFiles.has(diff.path) && (
        <div className="ml-5 mt-1 rounded bg-[#0d0d0d] p-2">
          <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed">
            {diff.hunks.map((hunk, hi) => (
              <div key={hi}>
                <div className="text-muted-foreground">
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </div>
                {hunk.lines.map((line, li) => (
                  <div
                    key={li}
                    className={cn(
                      line.type === "addition" && "bg-green-500/10 text-green-400",
                      line.type === "deletion" && "bg-red-500/10 text-red-400",
                      line.type === "context" && "text-muted-foreground"
                    )}
                  >
                    {line.type === "addition" && "+"}
                    {line.type === "deletion" && "-"}
                    {line.type === "context" && " "}
                    {line.content}
                  </div>
                ))}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Refresh button */}
      <div className="flex items-center justify-end px-4 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          {/* Unstaged Changes */}
          {unstagedChanges.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Unstaged Changes
              </h3>
              <div className="space-y-0.5">
                {unstagedChanges.map((diff) => (
                  <FileItem key={diff.path} diff={diff} />
                ))}
              </div>
            </div>
          )}

          {/* Staged Changes */}
          {stagedChanges.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Staged Changes
              </h3>
              <div className="space-y-0.5">
                {stagedChanges.map((diff) => (
                  <FileItem key={diff.path} diff={diff} />
                ))}
              </div>
            </div>
          )}

          {/* No changes message */}
          {diffs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <GitCommit className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No changes</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Commit section - fixed at bottom */}
      <div className="border-t border-border p-4 space-y-3">
        {/* Subject line */}
        <div className="relative">
          <Input
            placeholder="Summary (required)"
            value={commitSubject}
            onChange={(e) => setCommitSubject(e.target.value)}
            className="bg-muted/50 text-sm pr-8"
            disabled={isGenerating}
          />
          {isGenerating && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-portal-orange" />
          )}
        </div>

        {/* Description */}
        <Textarea
          placeholder="Description (optional)"
          value={commitDescription}
          onChange={(e) => setCommitDescription(e.target.value)}
          className="bg-muted/50 text-sm min-h-[60px] resize-none"
          disabled={isGenerating}
        />

        {/* Regenerate button */}
        {diffs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={generateCommitMessage}
            disabled={isGenerating}
          >
            <Sparkles className="mr-1.5 h-3 w-3" />
            {isGenerating ? "Generating..." : "Regenerate with AI"}
          </Button>
        )}

        {/* Commit button */}
        <Button
          className="w-full bg-portal-orange hover:bg-portal-orange/90 text-white font-medium"
          onClick={handleCommit}
          disabled={isCommitting || !commitSubject.trim() || diffs.length === 0}
        >
          {isCommitting ? "Committing..." : `Commit to ${currentBranch?.name || "main"}`}
        </Button>
      </div>

      {/* Create branch dialog */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Create a new branch from the current HEAD
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Branch name"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
