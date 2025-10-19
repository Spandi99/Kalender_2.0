import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { getReadableTextColor } from "../../utils/colorUtils";

const COLOR_CLASS_REGEX = /\btext-(?!xs\b|sm\b|base\b|lg\b|xl\b|2xl\b|3xl\b|4xl\b|5xl\b|6xl\b|7xl\b|8xl\b|9xl\b|left\b|right\b|center\b|justify\b)(\[[^\]]+\]|[a-z0-9-]+)\b/i;

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary hover:bg-primary/90",
        secondary: "bg-secondary hover:bg-secondary/85",
        outline: "border border-slate-600 bg-slate-900/40 hover:bg-slate-900/70",
        ghost: "hover:bg-slate-800/60",
        destructive: "bg-rose-600 hover:bg-rose-500",
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
  default: "#0066FF",
  secondary: "#1e293b",
  outline: "#111827",
  ghost: "#1f2937",
  destructive: "#dc2626",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { className, variant, size, asChild = false, style, backgroundColor, ...rest } = props;
  const Comp = asChild ? Slot : "button";
  const resolvedVariant = variant ?? "default";
  const resolvedBackground = backgroundColor ?? VARIANT_BACKGROUNDS[resolvedVariant] ?? "#1f2937";
  const hasClassBasedColor = typeof className === "string" && COLOR_CLASS_REGEX.test(className);
  const hasExplicitColor = hasClassBasedColor || typeof style?.color !== "undefined";

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
