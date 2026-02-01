import * as React from "react";
import { View } from "react-native";
import { cn } from "~/lib/utils";
import { useTheme } from "~/components/ThemeProvider";

type FileStatus = "added" | "modified" | "deleted";

interface FileStatusDotProps extends React.ComponentPropsWithoutRef<typeof View> {
  status: FileStatus;
}

const FileStatusDot = React.forwardRef<View, FileStatusDotProps>(
  ({ status, className, ...props }, ref) => {
    const { colors } = useTheme();

    // Match desktop: added=green, deleted=red, modified=primary
    const statusColors: Record<FileStatus, string> = {
      added: colors.success,
      modified: colors.primary,
      deleted: colors.destructive,
    };

    return (
      <View
        ref={ref}
        className={cn("h-2 w-2 shrink-0 rounded-sm", className)}
        style={{ backgroundColor: statusColors[status] }}
        {...props}
      />
    );
  }
);
FileStatusDot.displayName = "FileStatusDot";

export { FileStatusDot };
export type { FileStatus };
