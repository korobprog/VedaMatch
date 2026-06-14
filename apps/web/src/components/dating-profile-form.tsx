"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingProfile, UserMedia } from "@vedamatch/domain-types";
import type { Dictionary } from "@vedamatch/i18n";
import { useSession } from "@/components/session-context";
import { UnionDatingNav } from "@/components/union-dating-nav";
import { UnionPublicationPanel } from "@/components/union-publication-panel";

type DatingWebCopy = Dictionary["datingWeb"];

const LazyDatingPhotoEditor = dynamic(
  () => import("@/components/dating-photo-editor").then((module) => module.DatingPhotoEditor),
  {
    loading: () => <div className="dating-editor-loading" />,
    ssr: false,
  },
);

type FormState = {
  city: string;
  gender: string;
  dob: string;
  birthTime: string;
  birthPlaceLink: string;
  maritalStatus: string;
  bio: string;
  interests: string;
  lookingFor: string;
  intentions: string;
  childrenIntent: string;
  elementalPrimary: string;
  loveLanguages: string;
  datingEnabled: boolean;
};

type NoticeState = {
  loading: boolean;
  photoLoading: boolean;
  galleryLoading: boolean;
  submitLoading: boolean;
  error: string;
  success: string;
};

type SavedEditorImage = {
  name: string;
  extension: string;
  mimeType: string;
  imageBase64?: string;
  imageCanvas?: HTMLCanvasElement;
};

const EMPTY_FORM: FormState = {
  city: "",
  gender: "",
  dob: "",
  birthTime: "",
  birthPlaceLink: "",
  maritalStatus: "",
  bio: "",
  interests: "",
  lookingFor: "",
  intentions: "family",
  childrenIntent: "",
  elementalPrimary: "",
  loveLanguages: "",
  datingEnabled: true,
};

function normalizeGenderForForm(gender = ""): string {
  const normalized = gender.trim().toLowerCase();
  if (normalized === "male") {
    return "Male";
  }
  if (normalized === "female") {
    return "Female";
  }
  return gender;
}

function getSessionUserId(profile: DatingProfile | null, sessionUser: unknown): number {
  const user = sessionUser as { ID?: number; id?: number } | null;
  const id = Number(profile?.ID || profile?.id || user?.ID || user?.id || 0);
  return Number.isFinite(id) ? id : 0;
}

function profileToForm(profile: DatingProfile | null): FormState {
  return {
    city: profile?.city || "",
    gender: normalizeGenderForForm(profile?.gender),
    dob: profile?.dob || "",
    birthTime: profile?.birthTime || "",
    birthPlaceLink: profile?.birthPlaceLink || "",
    maritalStatus: profile?.maritalStatus || "",
    bio: profile?.bio || "",
    interests: profile?.interests || "",
    lookingFor: profile?.lookingFor || "",
    intentions: profile?.intentions || "family",
    childrenIntent: profile?.childrenIntent || "",
    elementalPrimary: profile?.elementalPrimary || "",
    loveLanguages: profile?.loveLanguages || "",
    datingEnabled: profile?.datingEnabled ?? true,
  };
}

function isFormReadyForReview(form: FormState, hasPhoto: boolean): boolean {
  const required = [
    form.bio,
    form.interests,
    form.lookingFor,
    form.maritalStatus,
    form.dob,
    form.birthTime,
    form.birthPlaceLink,
    form.city,
    form.childrenIntent,
    form.elementalPrimary,
    form.loveLanguages,
  ];
  return hasPhoto && required.every((value) => value.trim().length > 0);
}

function publicationStatusLabel(copy: DatingWebCopy, status?: string): string {
  switch (status) {
    case "published":
      return copy.statuses.published;
    case "pending_friend_approval":
      return copy.statuses.pendingFriendApproval;
    case "pending_admin_review":
      return copy.statuses.pendingAdminReview;
    case "pending_ai_review":
      return copy.statuses.pendingAiReview;
    case "rejected":
      return copy.statuses.rejected;
    case "flagged_after_publish":
      return copy.statuses.flagged;
    case "draft":
    default:
      return copy.statuses.draft;
  }
}

function datingStatusReasonLabel(copy: DatingWebCopy, reason = ""): string {
  const normalized = reason.trim().toLowerCase();
  if (normalized === "not enough friends for 3 approvals. sent to admin review.") {
    return copy.publication.needsAdminFallback;
  }
  return reason;
}

function getMediaId(media: UserMedia): number {
  const id = Number(media.ID || media.id || 0);
  return Number.isFinite(id) ? id : 0;
}

function getPrimaryPhoto(photos: UserMedia[]): UserMedia | null {
  return photos.find((photo) => photo.isProfile) || photos[0] || null;
}

function getMediaKey(media: UserMedia): string {
  return String(media.ID || media.id || media.url);
}

async function savedImageToFile(image: SavedEditorImage): Promise<File> {
  const mimeType = image.mimeType || "image/webp";
  const extension = image.extension || "webp";

  if (image.imageCanvas) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      image.imageCanvas?.toBlob((nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
        } else {
          reject(new Error("Could not export edited photo."));
        }
      }, mimeType, 0.92);
    });
    return new File([blob], `union-profile-photo.${extension}`, { type: mimeType });
  }

  if (image.imageBase64) {
    const dataUrl = image.imageBase64.startsWith("data:")
      ? image.imageBase64
      : `data:${mimeType};base64,${image.imageBase64}`;
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], `union-profile-photo.${extension}`, { type: mimeType });
  }

  throw new Error("Edited photo data is empty.");
}

export function DatingProfileForm() {
  const { dictionary, session, setSession } = useSession();
  const copy = dictionary.datingWeb;
  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [galleryPhotos, setGalleryPhotos] = useState<UserMedia[]>([]);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");
  const [viewedPhoto, setViewedPhoto] = useState<UserMedia | null>(null);
  const [photoActionId, setPhotoActionId] = useState(0);
  const [notice, setNotice] = useState<NoticeState>({
    loading: true,
    photoLoading: false,
    galleryLoading: false,
    submitLoading: false,
    error: "",
    success: "",
  });

  const client = useMemo(() => createBrowserClient(), []);
  const userId = getSessionUserId(profile, session?.user);
  const primaryPhoto = getPrimaryPhoto(galleryPhotos);
  const primaryPhotoUrl = primaryPhoto?.url ? client.getMediaUrl(primaryPhoto.url) : "";
  const viewedPhotoUrl = viewedPhoto?.url ? client.getMediaUrl(viewedPhoto.url) : "";
  const canSubmit = isFormReadyForReview(form, Boolean(primaryPhoto));

  useEffect(() => {
    const id = getSessionUserId(null, session?.user);
    if (!id) {
      setNotice((current) => ({ ...current, loading: false, error: copy.missingUser }));
      return;
    }

    let active = true;
    setNotice((current) => ({ ...current, loading: true, galleryLoading: true, error: "", success: "" }));
    Promise.all([client.getDatingProfile(id), client.getUserPhotos(id).catch(() => null)])
      .then(([nextProfile, nextPhotos]) => {
        if (!active) {
          return;
        }
        const photos = Array.isArray(nextPhotos) ? nextPhotos : nextProfile.photos || [];
        setProfile(nextProfile);
        setGalleryPhotos(photos);
        setForm(profileToForm(nextProfile));
        setNotice((current) => ({ ...current, loading: false, galleryLoading: false }));
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setNotice((current) => ({
          ...current,
          loading: false,
          galleryLoading: false,
          error: error instanceof Error ? error.message : copy.loadFailed,
        }));
      });

    return () => {
      active = false;
    };
  }, [client, copy.loadFailed, copy.missingUser, session?.user]);

  useEffect(() => {
    return () => {
      if (selectedPhotoUrl) {
        URL.revokeObjectURL(selectedPhotoUrl);
      }
    };
  }, [selectedPhotoUrl]);

  async function refreshProfile(nextUserId = userId): Promise<{ profile: DatingProfile; photos: UserMedia[] } | null> {
    if (!nextUserId) {
      return null;
    }
    const [nextProfile, nextPhotos] = await Promise.all([
      client.getDatingProfile(nextUserId),
      client.getUserPhotos(nextUserId).catch(() => null),
    ]);
    const photos = Array.isArray(nextPhotos) ? nextPhotos : nextProfile.photos || [];
    setProfile(nextProfile);
    setGalleryPhotos(photos);
    setForm(profileToForm(nextProfile));
    return { profile: nextProfile, photos };
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setNotice((current) => ({ ...current, error: copy.missingUser, success: "" }));
      return;
    }

    setNotice((current) => ({ ...current, loading: true, error: "", success: "" }));
    try {
      const updatedProfile = await client.updateDatingProfile(userId, {
        ...form,
        isProfileComplete: isFormReadyForReview(form, Boolean(primaryPhoto)),
      });
      setProfile(updatedProfile);
      if (updatedProfile.photos) {
        setGalleryPhotos(updatedProfile.photos);
      }
      setForm(profileToForm(updatedProfile));
      if (session?.user) {
        setSession({
          ...session,
          user: {
            ...session.user,
            city: updatedProfile.city || session.user.city,
          },
        });
      }
      setNotice((current) => ({ ...current, loading: false, success: copy.saved }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : copy.saveFailed,
      }));
    }
  }

  async function handlePhotoSave(image: SavedEditorImage) {
    if (!userId) {
      setNotice((current) => ({ ...current, error: copy.missingUser, success: "" }));
      return;
    }

    setNotice((current) => ({ ...current, photoLoading: true, error: "", success: "" }));
    try {
      const file = await savedImageToFile(image);
      const formData = new FormData();
      formData.append("photo", file);
      const media = await client.uploadUserPhoto(userId, formData);
      const mediaId = getMediaId(media);
      if (mediaId) {
        const profilePhoto = await client.setUserProfilePhoto(mediaId);
        if (session?.user) {
          setSession({
            ...session,
            user: {
              ...session.user,
              avatarUrl: profilePhoto.url || media.url || session.user.avatarUrl,
            },
          });
        }
      }
      await refreshProfile(userId);
      setSelectedPhotoUrl("");
      setNotice((current) => ({ ...current, photoLoading: false, success: copy.photoUploaded }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        photoLoading: false,
        error: error instanceof Error ? error.message : copy.photoFailed,
      }));
    }
  }

  async function handleSetMainPhoto(photo: UserMedia) {
    const mediaId = getMediaId(photo);
    if (!mediaId) {
      return;
    }

    setPhotoActionId(mediaId);
    setNotice((current) => ({ ...current, error: "", success: "" }));
    try {
      const profilePhoto = await client.setUserProfilePhoto(mediaId);
      if (session?.user) {
        setSession({
          ...session,
          user: {
            ...session.user,
            avatarUrl: profilePhoto.url || photo.url || session.user.avatarUrl,
          },
        });
      }
      await refreshProfile(userId);
      setNotice((current) => ({ ...current, success: copy.photoSetMain }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.photoSetMainFailed,
      }));
    } finally {
      setPhotoActionId(0);
    }
  }

  async function handleDeletePhoto(photo: UserMedia) {
    const mediaId = getMediaId(photo);
    if (!mediaId || !window.confirm(copy.deletePhotoConfirm)) {
      return;
    }

    setPhotoActionId(mediaId);
    setNotice((current) => ({ ...current, error: "", success: "" }));
    try {
      await client.deleteUserPhoto(mediaId);
      if (viewedPhoto && getMediaId(viewedPhoto) === mediaId) {
        setViewedPhoto(null);
      }
      const refreshed = await refreshProfile(userId);
      const nextPrimaryPhoto = refreshed ? getPrimaryPhoto(refreshed.photos) : null;
      if (session?.user) {
        setSession({
          ...session,
          user: {
            ...session.user,
            avatarUrl: nextPrimaryPhoto?.url || "",
          },
        });
      }
      setNotice((current) => ({ ...current, success: copy.photoDeleted }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.photoDeleteFailed,
      }));
    } finally {
      setPhotoActionId(0);
    }
  }

  async function handleSubmitForReview() {
    if (!userId) {
      setNotice((current) => ({ ...current, error: copy.missingUser, success: "" }));
      return;
    }

    setNotice((current) => ({ ...current, submitLoading: true, error: "", success: "" }));
    try {
      await client.submitDatingProfile(userId);
      await refreshProfile(userId);
      setNotice((current) => ({ ...current, submitLoading: false, success: copy.submitted }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        submitLoading: false,
        error: error instanceof Error ? error.message : copy.submitFailed,
      }));
    }
  }

  function handlePhotoInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (selectedPhotoUrl) {
      URL.revokeObjectURL(selectedPhotoUrl);
    }
    setSelectedPhotoUrl(URL.createObjectURL(file));
    event.target.value = "";
  }

  return (
    <div className="dating-profile-page">
      <UnionDatingNav />
      <section className="panel dating-profile-hero">
        <div className="section-head">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="dating-profile-status">
          <span>{copy.status}</span>
          <strong>{publicationStatusLabel(copy, profile?.datingPublicationStatus)}</strong>
          {profile?.datingStatusReason ? (
            <span className="muted">{copy.fields.statusReason}: {datingStatusReasonLabel(copy, profile.datingStatusReason)}</span>
          ) : null}
        </div>
      </section>

      <section className="panel dating-profile-grid">
        <div className="dating-photo-panel">
          <div className="dating-photo-preview">
            {primaryPhotoUrl ? (
              <img alt={copy.photoAlt} src={primaryPhotoUrl} />
            ) : (
              <span>{copy.noPhoto}</span>
            )}
            {primaryPhotoUrl ? <span className="dating-main-photo-badge">{copy.mainPhoto}</span> : null}
          </div>
          <div className="dating-photo-actions">
            <label className="button dating-upload-button">
              <input accept="image/*" onChange={handlePhotoInput} type="file" />
              {notice.photoLoading ? copy.uploading : copy.choosePhoto}
            </label>
            <p className="muted">{copy.photoHint}</p>
          </div>

          <div className="dating-gallery">
            <div className="dating-gallery-head">
              <h2>{copy.galleryTitle}</h2>
              {notice.galleryLoading ? <span>{copy.loading}</span> : <span>{galleryPhotos.length}</span>}
            </div>
            {galleryPhotos.length ? (
              <div className="dating-photo-grid">
                {galleryPhotos.map((photo) => {
                  const mediaId = getMediaId(photo);
                  const isPrimary = primaryPhoto ? getMediaKey(primaryPhoto) === getMediaKey(photo) : false;
                  const isBusy = Boolean(mediaId && photoActionId === mediaId);
                  return (
                    <article className={isPrimary ? "dating-photo-card is-primary" : "dating-photo-card"} key={getMediaKey(photo)}>
                      <button className="dating-photo-thumb" onClick={() => setViewedPhoto(photo)} type="button">
                        <img alt={copy.photoAlt} src={client.getMediaUrl(photo.url)} />
                        {isPrimary ? <span>{copy.mainPhoto}</span> : null}
                      </button>
                      <div className="dating-photo-card-actions">
                        <button className="button-secondary" onClick={() => setViewedPhoto(photo)} type="button">
                          {copy.viewPhoto}
                        </button>
                        <button
                          className="button-secondary"
                          disabled={isPrimary || isBusy}
                          onClick={() => void handleSetMainPhoto(photo)}
                          type="button"
                        >
                          {copy.setMainPhoto}
                        </button>
                        <button
                          className="button-secondary danger"
                          disabled={isBusy}
                          onClick={() => void handleDeletePhoto(photo)}
                          type="button"
                        >
                          {copy.deletePhoto}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="dating-gallery-empty">{notice.galleryLoading ? copy.loading : copy.noPhoto}</div>
            )}
          </div>
        </div>

        <form className="dating-form" onSubmit={handleSave}>
          {notice.error ? <div className="notice error-copy">{notice.error}</div> : null}
          {notice.success ? <div className="notice success">{notice.success}</div> : null}
          {notice.loading ? <div className="notice">{copy.loading}</div> : null}

          <label className="field">
            <span>{copy.city} *</span>
            <input onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} value={form.city} />
          </label>

          <label className="field">
            <span>{copy.fields.gender}</span>
            <select onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} value={form.gender}>
              <option value="">—</option>
              <option value="Male">{copy.fields.genderMale}</option>
              <option value="Female">{copy.fields.genderFemale}</option>
            </select>
          </label>

          <label className="field">
            <span>{copy.fields.maritalStatus} *</span>
            <input onChange={(event) => setForm((current) => ({ ...current, maritalStatus: event.target.value }))} value={form.maritalStatus} />
          </label>

          <label className="field">
            <span>{copy.fields.dob} *</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))}
              placeholder="1995-05-12"
              type="date"
              value={form.dob}
            />
          </label>

          <label className="field">
            <span>{copy.fields.birthTime} *</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
              type="time"
              value={form.birthTime}
            />
          </label>

          <label className="field">
            <span>{copy.fields.birthPlaceLink} *</span>
            <input onChange={(event) => setForm((current) => ({ ...current, birthPlaceLink: event.target.value }))} value={form.birthPlaceLink} />
          </label>

          <label className="field">
            <span>{copy.bio} *</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} value={form.bio} />
          </label>

          <label className="field">
            <span>{copy.interests} *</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, interests: event.target.value }))} value={form.interests} />
          </label>

          <label className="field">
            <span>{copy.lookingFor} *</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, lookingFor: event.target.value }))} value={form.lookingFor} />
          </label>

          <label className="field">
            <span>{copy.fields.childrenIntent} *</span>
            <input onChange={(event) => setForm((current) => ({ ...current, childrenIntent: event.target.value }))} value={form.childrenIntent} />
          </label>

          <label className="field">
            <span>{copy.fields.elementalPrimary} *</span>
            <input onChange={(event) => setForm((current) => ({ ...current, elementalPrimary: event.target.value }))} value={form.elementalPrimary} />
          </label>

          <label className="field">
            <span>{copy.fields.loveLanguages} *</span>
            <input onChange={(event) => setForm((current) => ({ ...current, loveLanguages: event.target.value }))} value={form.loveLanguages} />
          </label>

          <div className="dating-mode-control" role="group" aria-label={copy.intentions}>
            {[
              ["family", copy.family],
              ["friendship", copy.friendship],
              ["seva", copy.seva],
              ["business", copy.business],
            ].map(([value, label]) => (
              <button
                className={form.intentions === value ? "dating-mode-control__item is-active" : "dating-mode-control__item"}
                key={value}
                onClick={() => setForm((current) => ({ ...current, intentions: value }))}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <label className="dating-toggle">
            <input
              checked={form.datingEnabled}
              onChange={(event) => setForm((current) => ({ ...current, datingEnabled: event.target.checked }))}
              type="checkbox"
            />
            <span>{copy.enableProfile}</span>
          </label>

          <div className={canSubmit ? "notice success" : "notice"}>
            {canSubmit ? copy.fields.profileComplete : copy.fields.profileIncomplete}
          </div>
          {!primaryPhoto ? <p className="muted">{copy.fields.photoRequired}</p> : null}

          <div className="actions">
            <button className="button" disabled={notice.loading} type="submit">
              {notice.loading ? copy.saving : copy.save}
            </button>
            <button
              className="button-secondary"
              disabled={notice.submitLoading || !canSubmit}
              onClick={() => void handleSubmitForReview()}
              type="button"
            >
              {notice.submitLoading ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      </section>

      {userId ? <UnionPublicationPanel userId={userId} /> : null}

      {selectedPhotoUrl ? (
        <div className="dating-editor-modal">
          <div className="dating-editor-shell">
            {notice.photoLoading ? <div className="dating-editor-overlay">{copy.uploading}</div> : null}
            <LazyDatingPhotoEditor
              onCancel={() => setSelectedPhotoUrl("")}
              onSave={(image) => void handlePhotoSave(image)}
              source={selectedPhotoUrl}
            />
          </div>
        </div>
      ) : null}

      {viewedPhotoUrl ? (
        <div className="dating-photo-viewer" role="dialog" aria-modal="true">
          <div className="dating-photo-viewer-shell">
            <button className="dating-photo-viewer-close" onClick={() => setViewedPhoto(null)} type="button">
              x
            </button>
            <img alt={copy.photoAlt} src={viewedPhotoUrl} />
            <div className="dating-photo-viewer-actions">
              <button
                className="button-secondary"
                disabled={primaryPhoto && viewedPhoto ? getMediaKey(primaryPhoto) === getMediaKey(viewedPhoto) : false}
                onClick={() => viewedPhoto && void handleSetMainPhoto(viewedPhoto)}
                type="button"
              >
                {copy.setMainPhoto}
              </button>
              <button
                className="button-secondary danger"
                onClick={() => viewedPhoto && void handleDeletePhoto(viewedPhoto)}
                type="button"
              >
                {copy.deletePhoto}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
