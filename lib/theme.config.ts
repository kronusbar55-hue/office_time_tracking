/**
 * Theme Configuration
 * Complete color palette for light and dark modes
 * All colors are in RGB format for CSS variable compatibility
 */

export const lightTheme = {
  // Primary backgrounds
  "bg-primary": "255 255 255",
  "bg-secondary": "248 250 252",
  "bg-tertiary": "241 245 249",
  
  // Text colors
  "text-primary": "15 23 42",
  "text-secondary": "100 116 139",
  "text-tertiary": "148 163 184",
  
  // Border colors
  "border-color": "226 232 240",
  "border-light": "241 245 249",
  "border-dark": "203 213 225",
  
  // Card styling
  "card-bg": "255 255 255",
  "card-hover": "248 250 252",
  "card-border": "226 232 240",
  
  // Interactive elements
  "hover-bg": "241 245 249",
  "focus-ring": "219 234 254",
  "active-bg": "226 232 240",
  
  // Status colors
  "success": "34 197 94",
  "warning": "245 158 11",
  "error": "239 68 68",
  "info": "59 130 246",
  
  // Accent
  "accent": "14 165 233",
  "accent-soft": "224 242 254",
  "accent-hover": "2 132 199",
  
  // Semantic
  "disabled": "226 232 240",
  "disabled-text": "148 163 184",
  "input-bg": "255 255 255",
  "input-border": "226 232 240",
  
  // Kanban specific
  "kanban-column-bg": "248 250 252",
  "kanban-card-bg": "255 255 255",
  "kanban-drag-shadow": "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  
  // Charts
  "chart-grid": "226 232 240",
  "chart-axis": "100 116 139",
  "chart-bar": "14 165 233",
  
  // Scrollbar
  "scrollbar-thumb": "203 213 225",
  "scrollbar-track": "241 245 249"
};

export const darkTheme = {
  // Primary backgrounds
  "bg-primary": "5 8 22",
  "bg-secondary": "11 16 32",
  "bg-tertiary": "15 23 42",
  
  // Text colors
  "text-primary": "241 245 249",
  "text-secondary": "148 163 184",
  "text-tertiary": "100 116 139",
  
  // Border colors
  "border-color": "30 41 59",
  "border-light": "51 65 85",
  "border-dark": "15 23 42",
  
  // Card styling
  "card-bg": "15 23 42",
  "card-hover": "30 41 59",
  "card-border": "30 41 59",
  
  // Interactive elements
  "hover-bg": "30 41 59",
  "focus-ring": "15 23 42",
  "active-bg": "51 65 85",
  
  // Status colors
  "success": "52 211 153",
  "warning": "251 146 60",
  "error": "248 113 113",
  "info": "96 165 250",
  
  // Accent
  "accent": "56 189 248",
  "accent-soft": "11 18 32",
  "accent-hover": "34 211 238",
  
  // Semantic
  "disabled": "30 41 59",
  "disabled-text": "100 116 139",
  "input-bg": "15 23 42",
  "input-border": "30 41 59",
  
  // Kanban specific
  "kanban-column-bg": "11 16 32",
  "kanban-card-bg": "15 23 42",
  "kanban-drag-shadow": "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  
  // Charts
  "chart-grid": "30 41 59",
  "chart-axis": "148 163 184",
  "chart-bar": "56 189 248",
  
  // Scrollbar
  "scrollbar-thumb": "51 65 85",
  "scrollbar-track": "15 23 42"
};

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}
