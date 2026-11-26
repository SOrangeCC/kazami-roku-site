"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "切换深夜电台暗色模式" : "切换冬日冰蓝亮色模式"}
      title={theme === "light" ? "深夜电台模式" : "冬日冰蓝模式"}
      className="inline-flex items-center gap-1.5 rounded-full border border-frost bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:border-highlight hover:text-primary"
    >
      {theme === "light" ? (
        <>
          <Moon className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">深夜电台</span>
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5 text-highlight" />
          <span className="hidden sm:inline">冬日晴雪</span>
        </>
      )}
    </button>
  );
}
