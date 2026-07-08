# 🎨 TilePoint Material Design 3 (M3) Dynamic Theme Diagnostic Report

This report explains the design integration, active variables, and dynamic styling propagation mechanisms in TilePoint, answering why certain elements may retain "blue shades" under specific conditions and how to verify correct propagation of user-defined custom color themes.

---

## 🔍 Core Finding: Why Elements Default to Blue

The application is styled with **Material Design 3 (M3) guidelines**, utilizing native CSS variables declared on the `:root` element (`document.documentElement`). 

1. **Default State**: Under light mode or dark mode, if no custom color theme is chosen by the user in the *Privacy & Accessibility Hub*, the system defaults to the pre-configured high-fidelity theme:
   - **Light Mode Default**: Sapphire Blue (`#155EEF` / `rgb(21, 94, 239)`)
   - **Dark Mode Default**: Royal Blue (`#3B82F6` / `rgb(59, 130, 246)`)
2. **User-Defined Custom Themes**: When a user selects a preset color (such as Forest Green, Grape Purple, Velvet Red) or inputs a custom HEX code, the system dynamically calculates a complete tonal range and replaces the global CSS variables.
3. **Propagation Check**: Because components use semantic CSS classes (e.g., `bg-m3-primary`, `text-m3-on-surface`, `border-m3-outline-variant`), they will correctly and instantly update their colors. If an element appears "default blue," it is simply displaying the default theme color until another color is selected.

---

## 🛠️ Diagnostics of Target Components

Below is the verified styling state of the target components mentioned in your request:

### 1. Tables (Catalog, Adjustments, Suppliers)
* **Location**: `src/components/InventoryModule.tsx` and `src/components/ProcurementModule.tsx`
* **Implementation**: Standard tables do not contain hardcoded classes like `bg-blue-500` or `border-sky-500`.
* **Dynamic Styling**: 
  - Table headers use `bg-m3-surface/30` and `text-m3-on-surface-variant`.
  - Borders use `border-m3-outline-variant/20`.
  - Hover states on rows use `hover:bg-m3-hover-overlay`.
* **Propagation**: These are fully responsive to CSS variables. Changing the primary color from the Accessibility Hub instantly changes the hover highlights, selected badges, and outline borders of these tables.

### 2. Branch Cards
* **Location**: `src/components/BranchModule.tsx` and `src/components/Dashboard.tsx`
* **Implementation**: Cards are wrapped in semantic classes like `m3-card` or container classes that utilize CSS variable borders and surface containers.
* **Dynamic Styling**: 
  - Borders use `border-m3-outline-variant/20`.
  - Backgrounds use `bg-m3-surface-lowest` (light mode) or `bg-m3-surface-container` (dark mode).
  - Primary markers and highlights (e.g., active branch badges, primary headers) use `bg-m3-primary` or `text-m3-primary`.
* **Propagation**: Because they avoid hardcoded `bg-blue-` or `border-indigo-` classes, they cleanly shift color scheme when custom theme seeds are applied.

### 3. Expressive M3 Idle Clock Overlay
* **Location**: `src/components/IdleScreen.tsx`
* **Implementation**: The giant full-screen lock overlay leverages animated fluid SVGs and frosted glass blurs.
* **Dynamic Styling**: 
  - Ambient fluid blobs use `radial-gradient(circle, var(--m3-primary) 0%, rgba(0,0,0,0) 70%)` and `var(--m3-secondary)` to guarantee the background glow matches the active theme.
  - Morphing decorative outlines use `border-m3-primary/20` and `border-m3-secondary/25`.
  - Clock text uses `text-[var(--m3-on-surface)]`.
  - AMPM indicator uses `text-[var(--m3-primary)]`.
* **Propagation**: This overlay is 100% dynamic. If the active theme is changed, the clock face, background ambient blur animations, and date text colors automatically synchronize with the new color palette.

---

## 🚀 How to Run the Diagnostic Helper Script

To verify theme variables and inspect DOM container propagation in real time, we have provided an automated diagnostic utility built directly into the application.

### Step-by-Step Verification:
1. Open your browser **Developer Console** (Press `F12` or `Ctrl + Shift + I` / `Cmd + Option + I`).
2. Type and run the following function:
   ```javascript
   window.diagnoseTheme()
   ```
3. The script will instantly print a beautifully formatted console report listing:
   - **Active Seed**: Your currently applied `localStorage` custom seed color.
   - **CSS Variables State**: Real-time computed values for all core Material 3 tokens (e.g., primary, secondary, surface containers).
   - **Component Container Propagation**: Verification that the `idleClock`, `branchCards`, and `catalogTable` are correctly receiving and computing these variables without local styling blocks or hardcoded overrides.
   - **Actionable Recommendations**: Next steps depending on whether you are running in Default (Sapphire Blue) mode or Custom theme mode.

---

## 🎨 Troubleshooting & Recommendations

If a specific component ever fails to update:
- **Avoid Inline Styles**: Never use inline color rules like `style={{ color: '#155EEF' }}` unless intentionally overriding color schemes for static highlights. Always use Tailwind utility classes or dynamic style variables like `style={{ color: 'var(--m3-primary)' }}`.
- **Ditch Legacy Utility Classes**: Ensure classes such as `bg-blue-600` or `text-sky-500` are completely purged from generic component cards. Use `bg-m3-primary` and `text-m3-primary` respectively.
- **Use Opacity Modifiers Safely**: Tailwind's slash opacity syntax works seamlessly with CSS variables in Tailwind v4, e.g., `bg-m3-primary/10` generates a background with 10% opacity matching the active dynamic primary color.
