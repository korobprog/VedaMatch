# PLAN: Portal Role Images Implementation

## Overview
Create and implement high-quality, premium "Liquid Glass" style images for the four fundamental portal roles: **Искатель**, **В благости**, **Йог**, and **Преданный**. These images will replace the current placeholders to provide a "WOW" effect for users selecting their path.

## Project Type: MOBILE/WEB (Vedic AI App)

## Success Criteria
- 4 high-resolution images matching the "Liquid Glass" aesthetic (glossy, deep gradients, modern).
- Images correctly represent the essence of each role.
- Support for specific cultural details for the "Devotee" role (Gaudiya Math tradition).
- Images integrated into the React Native frontend assets.

## Aesthetic Style: "Liquid Glass"
- **Surface**: Glossy, transparent glass-like materials.
- **Lighting**: Subtle glows, caustics, and premium highlights (gold/silver).
- **Colors**: Based on existing `highlightColor` tokens in `portalRoles.ts`.
- **Composition**: Modern 3D illustrative style, central focus.

## Task Breakdown

### Phase 1: Image Generation (AI Design)
| Task ID | Name | Agent | Skills | Priority | Dependencies | Status |
|---------|------|-------|--------|----------|--------------|--------|
| T1.1 | Generate "Seeker" Image | `frontend-specialist` | frontend-design | P1 | None | ✅ |
| T1.2 | Generate "In Goodness" Image | `frontend-specialist` | frontend-design | P1 | None | ✅ |
| T1.3 | Generate "Yogi" Image | `frontend-specialist` | frontend-design | P1 | None | ✅ |
| T1.4 | Generate "Devotee" Image | `frontend-specialist` | frontend-design | P0 | None | ✅ |

### Phase 2: Asset Integration
| Task ID | Name | Agent | Skills | Priority | Dependencies | Status |
|---------|------|-------|--------|----------|--------------|--------|
| T2.1 | Convert & Save Assets | `frontend-specialist` | bash-linux | P1 | T1.1-T1.4 | ✅ |
| T2.2 | Verify `roleOptions.ts` paths | `frontend-specialist` | clean-code | P2 | T2.1 | ✅ |

## Phase X: Verification Checklist
- [x] All 4 images are generated and saved to `frontend/assets/roles/`.
- [x] Images are in a format compatible with React Native (PNG/JPG).
- [x] The "Devotee" image strictly follows the Gaudiya Math visual requirements (tilaka, shikha, beads).
- [x] All images follow the "Liquid Glass" naming and aesthetic.
- [x] UI Audit: Run `python .agent/skills/frontend-design/scripts/ux_audit.py .` to ensure visual hierarchy.

## Agent Assignments
- **Creative Director**: `frontend-specialist` (Prompt engineering and style consistency).
- **Implementer**: `mobile-developer` (Asset management and React Native integration).

## ✅ PHASE X COMPLETE
- Assets: ✅ Generated and Integrated
- Style: ✅ Liquid Glass Aesthetic
- Specific Requirements: ✅ Gaudiya Math attributes for 'Devotee'
- Date: 2026-02-09

