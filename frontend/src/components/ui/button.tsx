import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { getReadableTextColor } from "../../utils/colorUtils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary hover:bg-primary/90",
        secondary: "bg-secondary hover:bg-secondary/80",
        outline: "border border-muted bg-background hover:bg-accent",
        ghost: "hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  backgroundColor?: string;
}

const VARIANT_BACKGROUNDS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "hsl(222.2 47.4% 11.2%)",
  secondary: "hsl(210 40% 96.1%)",
  outline: "hsl(0 0% 100%)",
  ghost: "#1f2937",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { className, variant, size, asChild = false, style, backgroundColor, ...rest } = props;
  const Comp = asChild ? Slot : "button";
  const resolvedVariant = variant ?? "default";
  const resolvedBackground = backgroundColor ?? VARIANT_BACKGROUNDS[resolvedVariant] ?? "#1f2937";
  const hasExplicitColor = typeof style?.color !== "undefined";

  const textColor = React.useMemo(() => getReadableTextColor(resolvedBackground), [resolvedBackground]);

  const mergedStyle = React.useMemo<React.CSSProperties>(() => {
    if (hasExplicitColor) {
      return style ?? {};
    }
    return {
      ...style,
      color: textColor,
    };
  }, [hasExplicitColor, style, textColor]);

  return (
    <Comp
      className={cn(buttonVariants({ variant: resolvedVariant, size, className }), "text-current")}
      ref={ref}
      style={mergedStyle}
      data-contrast-color={textColor}
      data-background={resolvedBackground}
      {...rest}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
