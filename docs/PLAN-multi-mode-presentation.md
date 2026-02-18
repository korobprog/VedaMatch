# PLAN: Multi-Mode Union Presentation

Expand the existing "Union" presentation block to support multiple interaction modes: Family (Marriage), Business, Friendship, and Seva using a tabbed interface.

## 🔴 CRITICAL RULES
1. **Tabs Priority**: "Family" must be the first and default tab.
2. **Content**: Display both photos and skills/skills tags for profiles.
3. **Public Access**: Maintain no-auth access for this landing page block.
4. **Privacy**: No names or IDs, only photos and professional/spiritual skills.

## Phase 1: Backend Optimization (`server/`)

### 1.1 Update `GetDatingPresentation` in `dating_handler.go`
- Improve the query to categorize statistics and popular profiles by intention (marriage, business, friendship, seva).
- Return an object containing data for each mode.
- Data per profile: `AvatarURL` and `Skills`.
- Statistics per mode: `TotalCount`, and for "Family" specifically, keep `TotalMale`/`TotalFemale`.

### 1.2 Refine SQL Queries
- Use subqueries or separate queries to fetch top 10 popular profiles for EACH intention based on `DatingFavorite` count.
- Ensure efficient counting for stats.

## Phase 2: Frontend Implementation (`admin/`)

### 2.1 Update `UnionPresentationSection.tsx`
- **State Management**: Add `activeTab` state (default: 'family').
- **Tab Component**: Functional and stylish tabs (Family, Business, Friendship, Seva).
- **Dynamic Content**:
    - Update the gallery to show profiles based on the selected tab.
    - Add a "Skills" badge/overlay on the photos or below them to show expertise/interests.
    - Update statistics counters dynamically based on the active tab.
- **Micro-animations**: Smooth transitions when switching tabs using Framer Motion.

## Phase 3: Verification

### 3.1 API Validation
- Verify the new JSON structure contains data for all 4 modes.
- Ensure `Skills` are included in the response.

### 3.2 UI/UX Audit
- Check tab switching behavior.
- Ensure "Family" correctly shows Male/Female split if applicable.
- Verify "Skills" are readable and aesthetically pleasing on the cards.

## Agent Assignments
- **Backend Specialist**: Refactor API to support multi-mode data.
- **Frontend Specialist**: Implement tabbed UI and Skills display.

## Success Criteria
- [ ] Users can switch between Family, Business, Friendship, and Seva.
- [ ] First tab is "Family" by default.
- [ ] Photos and Skills are visible for profiles.
- [ ] Statistics update according to the selected mode.
