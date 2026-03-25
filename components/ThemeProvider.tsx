"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

/**
 * Enhanced Theme Provider
 * Wraps next-themes with:
 * - Proper hydration handling
 * - SSR safety
 * - Automatic system theme detection
 * - Smooth transitions
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // Prevent rendering until client-side hydration is complete
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme={false}
      disableTransitionOnChange={false}
      storageKey="theme-preference"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
