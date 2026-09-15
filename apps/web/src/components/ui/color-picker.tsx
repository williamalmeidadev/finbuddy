"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const PASTEL_COLORS = [
  "#f87171", // Pastel Red / Coral
  "#fb923c", // Pastel Orange
  "#facc15", // Pastel Yellow
  "#4ade80", // Pastel Green
  "#2dd4bf", // Pastel Teal
  "#38bdf8", // Pastel Sky Blue
  "#818cf8", // Pastel Indigo
  "#c084fc", // Pastel Purple
  "#f472b6", // Pastel Pink
  "#a1a1aa", // Pastel Slate / Gray
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ColorPicker({
  value = "#38bdf8",
  onChange,
  className,
  disabled = false,
}: ColorPickerProps) {
  const customInputRef = React.useRef<HTMLInputElement>(null);

  const normalizedValue = (value || "").toLowerCase();
  const isPreset = PASTEL_COLORS.some((c) => c.toLowerCase() === normalizedValue);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 py-1", className)}>
      {PASTEL_COLORS.map((presetColor) => {
        const isSelected = normalizedValue === presetColor.toLowerCase();

        return (
          <button
            key={presetColor}
            type="button"
            disabled={disabled}
            onClick={() => onChange(presetColor)}
            style={{ backgroundColor: presetColor }}
            aria-label={`Select color ${presetColor}`}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-full transition-all focus:outline-none disabled:opacity-50",
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
                : "hover:scale-105 opacity-90 hover:opacity-100"
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow stroke-[2.5]" />}
          </button>
        );
      })}

      {/* Custom color circle button (last option with + icon) */}
      <div className="relative flex items-center">
        <input
          ref={customInputRef}
          type="color"
          value={value || "#38bdf8"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="sr-only"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => customInputRef.current?.click()}
          style={!isPreset && value ? { backgroundColor: value } : undefined}
          title={!isPreset ? `Cor personalizada: ${value}` : "Escolher cor personalizada"}
          aria-label="Escolher cor personalizada"
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/20 transition-all hover:border-primary hover:bg-muted/40 focus:outline-none disabled:opacity-50",
            !isPreset
              ? "border-solid border-transparent ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
              : "hover:scale-105"
          )}
        >
          {!isPreset ? (
            <Check className="h-3.5 w-3.5 text-white drop-shadow stroke-[2.5]" />
          ) : (
            <Plus className="h-3.5 w-3.5 text-muted-foreground stroke-[2.5]" />
          )}
        </button>
      </div>
    </div>
  );
}
