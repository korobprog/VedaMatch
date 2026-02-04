# Task: UI/UX Redesign - Services Module

## 🎯 Goal
Upgrade the Services module (Home, My Services, Multi-step creation) to match the premium VedicAI design language: Dark Mode, Glassmorphism, and Gold Accents. Replace all emojis with professional Lucide icons.

---

## 🏗️ Phase 1: Iconography & Theme Standardization
- [ ] **Global Icon Mapping**: Update `frontend/services/serviceService.ts` to include a Lucide icon mapping for all categories.
- [ ] **Color Tokens**: Standardize colors to use `#FFD700` (Gold) for accents and the project's background gradients.

## 🎨 Phase 2: Services Home Screen (`ServicesHomeScreen.tsx`)
- [ ] **Header & Navigation**: Enhance the glassmorphism of the top navigation bar.
- [ ] **Quick Action Row**: Redesign the "Client" and "Provider" actions into a cohesive, premium grid or row with consistent iconography.
- [ ] **Search Bar**: Improve the input field with softer borders and better focus states.
- [ ] **Category Filter**: Revamp the horizontal category chips (Gold border for active, subtle glass for inactive).
- [ ] **Empty State**: Replace the magnifying glass emoji with a Lucide `Search` icon or a custom SVG.

## 🃏 Phase 3: Service Card Component (`ServiceCard.tsx`)
- [ ] **Glassmorphism**: Apply `rgba(255, 255, 255, 0.08)` with a subtle `1px` white/gold border.
- [ ] **Typography**: Use the theme fonts for Title and Owner names.
- [ ] **Stat Tags**: Replace emojis (⭐, 📅) with Lucide `Star` and `Calendar` icons.
- [ ] **Pricing Badge**: Refine the "From [Price]" layout with a better contrast gold.

## 🛠️ Phase 4: My Services Screen (`MyServicesScreen.tsx`)
- [ ] **Consistency Check**: Apply the same header and card styles used in the Home screen.
- [ ] **Action Buttons**: Standardize the Edit/Delete/Schedule buttons with consistent Lucide icons and hover-like interaction states.

## 🏁 Phase 5: Verification
- [ ] **Layout Audit**: Ensure no horizontal scrolling on 375px devices.
- [ ] **Contrast Check**: Verify that all text is readable against the dark gradient.
- [ ] **Interaction Audit**: Add subtle micro-animations (scale/opacity) on touch.

---

## 🔧 Technical Details
- **Framework**: React Native (FastImage, Lucide Icons, LinearGradient)
- **Primary Color**: `#FFD700`
- **Secondary Color**: `rgba(255, 255, 255, 0.6)`
- **Background**: `['#1a1a2e', '#16213e', '#0f3460']`
