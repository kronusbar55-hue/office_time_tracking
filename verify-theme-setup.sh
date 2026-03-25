#!/bin/bash

# Theme System Verification Script
# Verifies that all components and configuration are properly set up

echo "🎨 Dark Mode + Light Mode Theming System Verification"
echo "========================================================="
echo ""

# Check 1: CSS Variables
echo "✓ Checking CSS variables setup..."
if grep -q "bg-primary.*255 255 255" app/globals.css; then
  echo "  ✅ CSS variables for light mode found"
else
  echo "  ❌ CSS variables for light mode NOT found"
fi

if grep -q "\.dark" app/globals.css && grep -q "bg-primary.*5 8 22" app/globals.css; then
  echo "  ✅ CSS variables for dark mode found"
else
  echo "  ❌ CSS variables for dark mode NOT found"
fi

# Check 2: Tailwind Configuration
echo ""
echo "✓ Checking Tailwind configuration..."
if grep -q "darkMode.*class" tailwind.config.ts; then
  echo "  ✅ Dark mode configured in Tailwind"
else
  echo "  ❌ Dark mode NOT configured in Tailwind"
fi

if grep -q "bg-bg-primary" tailwind.config.ts; then
  echo "  ✅ Color variables configured in Tailwind"
else
  echo "  ❌ Color variables NOT configured in Tailwind"
fi

# Check 3: Theme Files
echo ""
echo "✓ Checking theme files..."
files=(
  "lib/theme.config.ts"
  "lib/useTheme.ts"
  "lib/themeUtils.ts"
  "components/ThemeProvider.tsx"
  "components/ThemeToggle.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file exists"
  else
    echo "  ❌ $file NOT found"
  fi
done

# Check 4: Component Updates
echo ""
echo "✓ Checking component theming..."
components=(
  "components/kanban/Board.tsx:bg-bg-primary"
  "components/kanban/Column.tsx:kanban-column-bg"
  "components/kanban/TaskCard.tsx:kanban-card-bg"
  "components/layout/Sidebar.tsx:bg-bg-secondary"
  "components/layout/Topbar.tsx:bg-bg-secondary"
  "components/layout/DashboardShell.tsx:bg-bg-primary"
  "components/tasks/TaskModal.tsx:bg-accent"
)

for component in "${components[@]}"; do
  IFS=':' read -r file color <<< "$component"
  if grep -q "$color" "$file" 2>/dev/null; then
    echo "  ✅ $file is themed"
  else
    echo "  ❌ $file may need theming"
  fi
done

# Check 5: API Setup
echo ""
echo "✓ Checking API setup..."
if [ -f "app/api/user/theme/route.ts" ]; then
  echo "  ✅ Theme API endpoint exists"
  if grep -q "themePreference" app/api/user/theme/route.ts; then
    echo "  ✅ Theme API properly configured"
  else
    echo "  ❌ Theme API may not be properly configured"
  fi
else
  echo "  ❌ Theme API endpoint NOT found"
fi

# Check 6: Database Model
echo ""
echo "✓ Checking User model..."
if grep -q "themePreference" models/User.ts 2>/dev/null; then
  echo "  ✅ User model has themePreference field"
else
  echo "  ⚠️  User model may not have themePreference field (not critical)"
fi

# Check 7: Next.js Setup
echo ""
echo "✓ Checking Next.js setup..."
if grep -q "next-themes" package.json; then
  echo "  ✅ next-themes is installed"
else
  echo "  ❌ next-themes NOT installed - run: npm install next-themes"
fi

echo ""
echo "========================================================="
echo "📊 Verification Summary:"
echo ""
echo "If all checks show ✅, the theme system is ready to use!"
echo ""
echo "To test:"
echo "  1. Start dev server: npm run dev"
echo "  2. Open http://localhost:3000"
echo "  3. Click the theme toggle (sun/moon icon) in top-right"
echo "  4. Switch between Light, Dark, and System modes"
echo "  5. Refresh the page - theme should persist"
echo ""
echo "========================================================="
