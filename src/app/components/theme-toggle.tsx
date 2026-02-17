"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "mdmm-theme";

type ThemeMode = "light" | "dark";

const getSystemTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
};

const applyTheme = (theme: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
};

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const nextTheme = stored ?? getSystemTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 ${className}`}
      >
        <Sun size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}`}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 ${className}`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
