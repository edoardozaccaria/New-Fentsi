import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900",
        "placeholder:text-slate-400 transition-colors resize-none",
        "focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 focus:border-slate-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
