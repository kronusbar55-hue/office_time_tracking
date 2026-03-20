"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSetTheme = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setIsOpen(false);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch("/api/user/theme", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ themePreference: newTheme })
        });
      }
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  if (!mounted) {
    return <div className="h-9 w-9 rounded-md bg-card-bg border border-border-color animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border-color bg-card-bg text-text-secondary hover:bg-hover-bg hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 transition-transform duration-200 dark:-rotate-90 dark:scale-0 max-dark:scale-100 max-dark:rotate-0" />
        <Moon className="absolute h-4 w-4 transition-transform duration-200 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-xl border border-border-color bg-card-bg py-1 shadow-card z-50 animate-fade-in-up">
            <button
              onClick={() => handleSetTheme("light")}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-hover-bg ${
                theme === "light" ? "text-accent font-semibold" : "text-text-secondary"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => handleSetTheme("dark")}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-hover-bg ${
                theme === "dark" ? "text-accent font-semibold" : "text-text-secondary"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => handleSetTheme("system")}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-hover-bg ${
                theme === "system" ? "text-accent font-semibold" : "text-text-secondary"
              }`}
            >
              <Laptop className="h-4 w-4" /> System
            </button>
          </div>
        </>
      )}
    </div>
  );
}
