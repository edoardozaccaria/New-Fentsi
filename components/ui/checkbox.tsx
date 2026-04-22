import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, className, id, disabled }: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      id={id}
      type="button"
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white",
        className,
      )}
    >
      {checked && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          fill="none"
          className="h-3 w-3"
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
