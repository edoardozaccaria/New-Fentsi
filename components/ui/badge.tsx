import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "outline" | "accent" | "partner";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-900 text-white",
  outline: "border border-slate-200 text-slate-700 bg-transparent",
  accent: "bg-violet-100 text-violet-900",
  partner: "bg-amber-100 text-amber-800",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
