"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 bg-card border border-border rounded-full w-8 h-8 flex items-center justify-center hover:bg-card-hover transition-colors cursor-pointer text-sm"
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
