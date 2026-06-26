"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { updateTheme } from "@/server/actions/settings";

export function ThemePicker({ current }: { current: ThemeKey }) {
  const [selected, setSelected] = useState<ThemeKey>(current);
  const [, start] = useTransition();

  function pick(key: ThemeKey) {
    if (key === selected) return;
    setSelected(key);
    document.getElementById("admin-root")?.setAttribute("data-theme", key);
    // notifie la barre flottante (qui a son propre data-theme)
    window.dispatchEvent(new CustomEvent("ac:theme", { detail: key }));
    start(async () => {
      try {
        await updateTheme(key);
        toast.success("Thème mis à jour");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  return (
    <div className="grid h-full grid-cols-3 gap-3 [grid-auto-rows:1fr] sm:grid-cols-4">
      {THEMES.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => pick(t.key)}
            title={t.label}
            aria-pressed={active}
            className="flex h-full flex-col gap-1.5"
          >
            <span
              className={`relative flex w-full flex-1 items-center justify-between gap-1 overflow-hidden rounded-lg border px-3 transition-shadow ${
                active
                  ? "border-primary ring-2 ring-primary"
                  : "border-border hover:border-foreground/40"
              }`}
              style={{ backgroundColor: t.bg }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="size-4 rounded-full ring-1 ring-black/5"
                  style={{ backgroundColor: t.primary }}
                />
                <span
                  className="size-3 rounded-full ring-1 ring-black/5"
                  style={{ backgroundColor: t.muted }}
                />
              </span>
              <span
                className="text-base font-semibold leading-none"
                style={{ color: t.fg }}
              >
                Aa
              </span>
              {active && (
                <Check
                  className="absolute left-1/2 top-1 size-3.5 -translate-x-1/2"
                  style={{ color: t.primary }}
                />
              )}
            </span>
            <span className="w-full truncate text-center text-[11px] leading-tight text-muted-foreground">
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
