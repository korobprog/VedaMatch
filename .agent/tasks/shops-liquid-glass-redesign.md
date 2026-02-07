# Task: Shops & Market Liquid Glass Redesign

Redesign the Market and Shops screens to match the premium "Liquid Glass" aesthetic established in the Cafe and Portal services.

## Status: 🟢 In Progress

## 📝 Analysis
- Current UI uses basic `colors.primary` backgrounds and standard React Native components.
- The goal is to move to a dark, mystical theme with gold accents, `Cinzel-Bold` typography, and glassmorphic elements.
- Screens to update: `MarketHomeScreen.tsx`, `ShopsScreen.tsx`.
- Components to update: `ProductCard.tsx`.

## 🛠 Plan

### Phase 1: Market Home Redesign
- [x] Update `MarketHomeScreen.tsx` with `LinearGradient` background.
- [x] Apply `Cinzel-Bold` to the Hero title.
- [x] Style Hero buttons and search bar with glass effects.
- [x] Update category pills to match the theme.

### Phase 2: Shops Screen Redesign
- [x] Update `ShopsScreen.tsx` with `LinearGradient` background.
- [x] Redesign Shop cards with glassmorphism, gold rating stars, and refined typography.
- [x] Implement a premium header with "Back" and "Wallet" balance (consistent with Cafe).

### Phase 3: Product Card Refinement
- [x] Update `frontend/components/market/ProductCard.tsx` to use glassmorphic backgrounds and premium styling.

### Phase 4: Verification
- [x] Check accessibility (contrast).
- [x] Verify animations and transitions.
- [x] Ensure consistent look across devices.
- [x] Redesign `EmptyState` and `Skeleton` for theme consistency.

## 🎨 Design Tokens (Liquid Glass)
- Background: `#0a0a14` to `#12122b` (Gradient)
- Cards: `rgba(25, 25, 45, 0.5)` with `rgba(255, 255, 255, 0.08)` border.
- Accents: `#F59E0B` (Gold).
- Font: `Cinzel-Bold` for service titles.
