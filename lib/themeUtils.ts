/**
 * Theme Utility Functions
 * Provides helper functions for theme-aware styling and logic
 */

import React from "react";
import { useTheme } from "@/lib/useTheme";
import { lightTheme, darkTheme } from "@/lib/theme.config";

/**
 * Get the current theme colors
 */
export function useThemeColors() {
  const { isDark } = useTheme();
  return isDark ? darkTheme : lightTheme;
}

/**
 * Get a specific color based on current theme
 */
export function useThemeColor(colorKey: keyof typeof lightTheme) {
  const colors = useThemeColors();
  return colors[colorKey];
}

/**
 * Helper to conditionally apply theme-based classes
 */
export function getThemeClass(
  lightClass: string,
  darkClass: string,
  isDark: boolean
): string {
  return isDark ? darkClass : lightClass;
}

/**
 * CSS-in-JS helper for theme-aware styles
 */
export function getThemeStyles(
  lightStyles: React.CSSProperties,
  darkStyles: React.CSSProperties,
  isDark: boolean
): React.CSSProperties {
  return isDark ? darkStyles : lightStyles;
}

/**
 * Apply theme class to document root
 */
export function applyThemeToDocument(isDark: boolean) {
  if (typeof document === "undefined") return;
  
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Get contrast-safe text color based on background
 */
export function getContrastTextColor(backgroundColor: string): string {
  // Simple luminance calculation
  const [r, g, b] = backgroundColor.match(/\d+/g) || ["255", "255", "255"];
  const luminance = (parseInt(r) * 299 + parseInt(g) * 587 + parseInt(b) * 114) / 1000;
  return luminance > 128 ? "dark" : "light";
}

/**
 * Theme-aware chart colors generator
 */
export function getChartColors(isDark: boolean) {
  if (isDark) {
    return {
      primary: "rgb(56 189 248)", // cyan-400
      secondary: "rgb(96 165 250)", // blue-400
      success: "rgb(52 211 153)", // emerald-400
      warning: "rgb(251 146 60)", // orange-400
      error: "rgb(248 113 113)", // red-400
      grid: "rgb(30 41 59)",
      axis: "rgb(148 163 184)",
      background: "rgb(5 8 22)"
    };
  }
  
  return {
    primary: "rgb(14 165 233)", // cyan-500
    secondary: "rgb(59 130 246)", // blue-500
    success: "rgb(34 197 94)", // green-500
    warning: "rgb(245 158 11)", // amber-500
    error: "rgb(239 68 68)", // red-500
    grid: "rgb(226 232 240)",
    axis: "rgb(100 116 139)",
    background: "rgb(255 255 255)"
  };
}

/**
 * Get theme-aware shadow
 */
export function getThemedShadow(isDark: boolean, intensity: "sm" | "md" | "lg" = "md") {
  const shadows = {
    light: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      lg: "0 20px 25px -5px rgb(0 0 0 / 0.1)"
    },
    dark: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.5)",
      lg: "0 20px 25px -5px rgb(0 0 0 / 0.5)"
    }
  };
  
  return isDark ? shadows.dark[intensity] : shadows.light[intensity];
}

/**
 * Sync theme across multiple browser tabs
 */
export function useSyncThemeAcrossTabs() {
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme-preference") {
        const newTheme = e.newValue;
        if (newTheme && typeof document !== "undefined") {
          if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
}
