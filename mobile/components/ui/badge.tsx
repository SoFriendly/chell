import * as React from "react";
import { View, Text } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "flex-row items-center rounded-full px-2.5 py-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary",
        destructive: "bg-destructive",
        outline: "border border-border bg-transparent",
        success: "bg-green-600",
        warning: "bg-yellow-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const badgeTextVariants = cva("text-xs font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      success: "text-white",
      warning: "text-black",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface BadgeProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

const Badge = React.forwardRef<View, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {typeof children === "string" ? (
          <Text className={cn(badgeTextVariants({ variant }))}>{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
