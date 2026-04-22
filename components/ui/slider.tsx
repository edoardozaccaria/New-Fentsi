import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled,
}: SliderProps) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;

  return (
    <input
      type="range"
      className={cn("w-full cursor-pointer accent-slate-900", className)}
      value={currentValue}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    />
  );
}
