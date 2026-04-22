import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function ScrollArea({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-y-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
}
