import * as React from "react";
import { TextInput, View, Text } from "react-native";
import { cn } from "~/lib/utils";

interface InputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <View className="w-full">
        {label && (
          <Text className="mb-1.5 text-sm font-medium text-foreground">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={cn(
            "h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground",
            error && "border-destructive",
            className
          )}
          placeholderTextColor="#666"
          {...props}
        />
        {error && (
          <Text className="mt-1 text-sm text-destructive">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";

export { Input };
