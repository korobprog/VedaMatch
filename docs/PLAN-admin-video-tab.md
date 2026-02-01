# Add Video Tab to Admin Panel Plan

## 🟢 Overview
Enhance the Admin Panel Multimedia Hub by adding a dedicated "Videos" tab. This separates video content from audio tracks, improving usability and content management.

## 🎯 Success Criteria
- [ ] Users see a "Videos" tab in the Multimedia Hub.
- [ ] Clicking "Add Video" opens a modal pre-filled for video upload.
- [ ] The "Tracks" tab shows ONLY audio files (or has a clear filter).
- [ ] Uploading a video works correctly (integrating with S3 + Redis flow).

## 🛠 Tasks

### Phase 1: Frontend Update (Admin)
- [ ] **Modify `admin/src/app/multimedia/page.tsx`**
  - Update `TabType` to include `'videos'`.
  - Add "Videos" to the `tabs` array with a distinct icon (e.g., `Film` or `Video`).
  - Implement filtering logic:
    - Tab `tracks` → Show `mediaType === 'audio'` (or all, but rename to Audio if strict separation desired).
    - Tab `videos` → Show `mediaType === 'video'`.
  - Update `TracksTable` to handle both lists or create a `VideosTable` if column differences exist (e.g., Duration, Thumbnail).
  - Ensure "Add Video" button sets `mediaType: 'video'` in the new item state.

### Phase 2: Verification
- [ ] **Build & Test**
  - Run the admin panel locally.
  - Verify switching tabs works.
  - Verify "Add Video" pre-selects "Video" type.
  - Verify upload flow for a small video file.

## notes
- We will reuse the existing `TracksTable` component but filter data passed to it, or clone it if design diverges.
- API endpoints remains `/multimedia/tracks`, frontend filters the view.
