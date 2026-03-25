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
    return (
      <div className="h-9 w-9 rounded-lg bg-border-color dark:bg-bg-secondary/40 border border-border-color shadow-sm animate-pulse" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative">
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-secondary hover:bg-card-hover hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-bg-primary"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Sun className="h-4 w-4 transition-all duration-300 absolute scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
        <Moon className="h-4 w-4 transition-all duration-300 absolute scale-0 rotate-90 dark:rotate-0 dark:scale-100" />
      </button>

      {/* Theme Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Menu */}
          <div 
            className="absolute right-0 mt-2 w-40 origin-top-right rounded-xl border border-card-border bg-card-bg shadow-lg z-50 animate-fade-in-up overflow-hidden"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="theme-toggle-button"
          >
            {/* Light Theme Option */}
            <button
              onClick={() => handleSetTheme("light")}
              role="menuitem"
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-card-hover ${
                theme === "light" 
                  ? "text-accent bg-accent-soft/10" 
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Sun className="h-4 w-4" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
            </button>

            {/* Dark Theme Option */}
            <button
              onClick={() => handleSetTheme("dark")}
              role="menuitem"
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-card-hover ${
                theme === "dark" 
                  ? "text-accent bg-accent-soft/10" 
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Moon className="h-4 w-4" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
            </button>

            {/* Divider */}
            <div className="h-px bg-card-border mx-2" />

            {/* System Theme Option */}
            <button
              onClick={() => handleSetTheme("system")}
              role="menuitem"
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-card-hover rounded-b-lg ${
                theme === "system" 
                  ? "text-accent bg-accent-soft/10" 
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Laptop className="h-4 w-4" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
