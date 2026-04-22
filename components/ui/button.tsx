import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, type ReactElement, Children, cloneElement } from "react";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950",
  outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10 p-0",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (asChild && Children.count(children) === 1) {
    const child = Children.only(children) as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
