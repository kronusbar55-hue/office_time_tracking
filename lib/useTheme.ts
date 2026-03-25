"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ThemeMode } from "@/lib/theme.config";

export function useTheme() {
  const { theme, setTheme: setNextTheme, resolvedTheme, systemTheme } = useNextTheme();
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load theme from DB on user login
  useEffect(() => {
    if (!mounted || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadUserTheme = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/user/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          const userTheme = userData.themePreference || userData.user?.themePreference || "system";
          if (userTheme && theme !== userTheme) {
            setNextTheme(userTheme);
          }
        }
      } catch (error) {
        console.error("Failed to load user theme:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [isAuthenticated, mounted, setNextTheme, theme]);

  // Save theme preference to DB
  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      try {
        setNextTheme(newTheme);
        
        const token = localStorage.getItem("token");
        if (token && isAuthenticated) {
          const response = await fetch("/api/user/theme", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ themePreference: newTheme })
          });

          if (!response.ok) {
            console.error("Failed to save theme preference");
          }
        }
      } catch (error) {
        console.error("Failed to set theme:", error);
      }
    },
    [setNextTheme, isAuthenticated]
  );

  // Get the actual resolved theme (light or dark)
  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";

  // Detect system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      // When system preference changes and user is in system mode, update the theme
      document.documentElement.classList.toggle("dark", e.matches);
    };

    try {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [mounted, theme]);

  return {
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    isDark,
    isLight,
    mounted,
    isLoading
  };
}

export type UseThemeReturn = ReturnType<typeof useTheme>;
