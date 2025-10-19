import * as React from "react";

import { getReadableTextColor } from "../../utils/colorUtils";
import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  backgroundColor?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, style, backgroundColor, ...props }, ref) => {
  const surfaceColor = backgroundColor ?? "#ffffff";
  const hasExplicitColor = typeof style?.color !== "undefined" || (className ? /text-\S+|text\[/.test(className) : false);
  const textColor = React.useMemo(() => getReadableTextColor(surfaceColor), [surfaceColor]);

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
    <div
      ref={ref}
      className={cn("rounded-lg border bg-white shadow-sm", className)}
      style={mergedStyle}
      data-background={surfaceColor}
      data-contrast-color={textColor}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
