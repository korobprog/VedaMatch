# PLAN: Union Presentation on Landing Page

Implementation of a block for the landing page of the admin panel to showcase the "Union" (Dating) service.

## 🔴 CRITICAL RULES
1. **Public Access**: The data must be accessible to non-authenticated users.
2. **Privacy**: Only show photos. No names, IDs, or other personal data.
3. **App Links**: Use placeholders for app store links as requested.

## Phase 1: Backend Implementation (`server/`)

### 1.1 Add Presentation Handler
- File: `server/internal/handlers/dating_handler.go`
- Add `GetDatingPresentation` method.
- Logic:
    - Query 10 "popular" dating profiles. Popularity is determined by the number of favorites in `DatingFavorite`. 
    - Select only `avatar_url` (or first photo from `Photos` join).
    - Count total male profiles (`gender = 'Male'`) with `dating_enabled = true`.
    - Count total female profiles (`gender = 'Female'`) with `dating_enabled = true`.
    - Return JSON: `{ "photos": string[], "totalMale": int, "totalFemale": int }`.

### 1.2 Register Public Route
- File: `server/cmd/api/main.go`
- Register `GET /api/dating/presentation` *before* the protected group.
- Ensure CORS allows public access for this route.

## Phase 2: Frontend Implementation (`admin/`)

### 2.1 Create UI Component
- File: `admin/src/components/landing/UnionPresentationSection.tsx`
- Design:
    - Premium look with soft gradients (pink/indigo or orange/red).
    - Heading: "Союз Знакомства" or "Найдите свою духовную половинку".
    - Counters: "Анкет в системе: {totalMale + totalFemale} ({totalMale} м / {totalFemale} ж)".
    - Gallery: A grid or masonry layout of 10 photos with smooth hover effects.
    - CTA: "Скачать приложение" button (linking to a placeholder or future app links).

### 2.2 Integrate into Landing Page
- File: `admin/src/components/landing/LandingPage.tsx`
- Import `UnionPresentationSection`.
- Place it after `PhilosophySection` as a transitional interactive block before the `TeamSection` or `CommunitySection`.

## Phase 3: Verification

### 3.1 Backend Test
- `curl http://localhost:8081/api/dating/presentation`
- Verify JSON structure and that no personal data is leaked.

### 3.2 Frontend Audit
- Check responsiveness (mobile/tablet/desktop).
- Verify photos load correctly.
- Ensure the section fits the overall aesthetic of the landing page.

## Agent Assignments
- **Backend Specialist**: API implementation and route registration.
- **Frontend Specialist**: UI component creation and landing page integration.
- **Project Planner**: Overall coordination and verification.

## Success Criteria
- [ ] Public API endpoint `/api/dating/presentation` works.
- [ ] Photos are correctly displayed on the landing page.
- [ ] Male/Female counters are accurate.
- [ ] No names or private info is shown in the presentation block.
- [ ] Design looks premium and matches the VedaMatch ecosystem style.
