import { cn } from "@/lib/utils";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, className, disabled }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      type="button"
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-slate-900" : "bg-slate-200",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
