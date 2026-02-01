import * as React from "react";
import { Text } from "react-native";
import { cn } from "~/lib/utils";

interface SectionHeaderProps extends React.ComponentPropsWithoutRef<typeof Text> {
  children: React.ReactNode;
}

const SectionHeader = React.forwardRef<Text, SectionHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn(
        "text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2",
        className
      )}
      {...props}
    >
      {children}
    </Text>
  )
);
SectionHeader.displayName = "SectionHeader";

export { SectionHeader };
