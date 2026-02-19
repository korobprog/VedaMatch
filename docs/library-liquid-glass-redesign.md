# Library Screens — Liquid Glass Redesign

## Goal
Redesign all 3 library screens (ReaderScreen, LibraryHomeScreen, BookListScreen) with:
- Liquid Glass aesthetic (translucent, blur, fluid transitions)
- Full `useRoleTheme` / `isDarkMode` / `isPhotoBg` support
- Premium feel with smooth animations

## Files to Modify
1. `frontend/screens/library/ReaderScreen.tsx` — Main reader (1094 lines)
2. `frontend/screens/library/LibraryHomeScreen.tsx` — Book listing (409 lines) ✅ Already has roleTheme
3. `frontend/screens/library/BookListScreen.tsx` — Category listing (145 lines) ✅ Already has roleTheme

## Design Tokens (Liquid Glass for Mobile)
- **Glass surfaces**: `rgba(255,255,255,0.12)` dark / `rgba(255,255,255,0.85)` light
- **Glass border**: `rgba(255,255,255,0.22)` dark / `rgba(200,200,200,0.4)` light
- **Blur**: BlurView blurAmount 14-18
- **Transitions**: 300-500ms ease curves
- **Shadows**: Soft, diffused, color-matched to accent

## Key Changes

### ReaderScreen (biggest change):
- Add `useRoleTheme`, `useSettings`, `isPhotoBg` support
- Replace hardcoded `#FF8000` → roleColors.accent
- Replace hardcoded backgrounds → glass surfaces with BlurView
- Redesign chapter/verse navigation → floating glass pill selectors
- Redesign verse cards → frosted glass cards
- Redesign settings modal → glass bottom sheet
- Redesign bookmarks modal → glass overlay
- Redesign footer nav → glass buttons with soft glow
- Add LinearGradient accents on active states
- Update all 4 themes (paper, sepia, dark, ancient) to work with glass

### LibraryHomeScreen (minor polish):
- Already has roleTheme ✅
- Polish glass card effects
- Add subtle entrance animations

### BookListScreen (minor polish):
- Already has roleTheme ✅
- Consistent with LibraryHomeScreen polish
