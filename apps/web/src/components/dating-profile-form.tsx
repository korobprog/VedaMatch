"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingProfile, UserMedia } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

const LazyDatingPhotoEditor = dynamic(
  () => import("@/components/dating-photo-editor").then((module) => module.DatingPhotoEditor),
  {
    loading: () => <div className="dating-editor-loading" />,
    ssr: false,
  },
);

type FormState = {
  city: string;
  bio: string;
  interests: string;
  lookingFor: string;
  intentions: string;
  datingEnabled: boolean;
};

type NoticeState = {
  loading: boolean;
  photoLoading: boolean;
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
  bio: "",
  interests: "",
  lookingFor: "",
  intentions: "family",
  datingEnabled: true,
};

function getSessionUserId(profile: DatingProfile | null, sessionUser: unknown): number {
  const user = sessionUser as { ID?: number; id?: number } | null;
  const id = Number(profile?.ID || profile?.id || user?.ID || user?.id || 0);
  return Number.isFinite(id) ? id : 0;
}

function profileToForm(profile: DatingProfile | null): FormState {
  return {
    city: profile?.city || "",
    bio: profile?.bio || "",
    interests: profile?.interests || "",
    lookingFor: profile?.lookingFor || "",
    intentions: profile?.intentions || "family",
    datingEnabled: profile?.datingEnabled ?? true,
  };
}

function getMediaId(media: UserMedia): number {
  const id = Number(media.ID || media.id || 0);
  return Number.isFinite(id) ? id : 0;
}

function getPrimaryPhoto(profile: DatingProfile | null): UserMedia | null {
  const photos = profile?.photos || [];
  return photos.find((photo) => photo.isProfile) || photos[0] || null;
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
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");
  const [notice, setNotice] = useState<NoticeState>({
    loading: true,
    photoLoading: false,
    submitLoading: false,
    error: "",
    success: "",
  });

  const client = useMemo(() => createBrowserClient(), []);
  const userId = getSessionUserId(profile, session?.user);
  const primaryPhoto = getPrimaryPhoto(profile);
  const primaryPhotoUrl = primaryPhoto?.url ? client.getMediaUrl(primaryPhoto.url) : "";
  const photos = profile?.photos || [];

  useEffect(() => {
    const id = getSessionUserId(null, session?.user);
    if (!id) {
      setNotice((current) => ({ ...current, loading: false, error: copy.missingUser }));
      return;
    }

    let active = true;
    setNotice((current) => ({ ...current, loading: true, error: "", success: "" }));
    client
      .getDatingProfile(id)
      .then((nextProfile) => {
        if (!active) {
          return;
        }
        setProfile(nextProfile);
        setForm(profileToForm(nextProfile));
        setNotice((current) => ({ ...current, loading: false }));
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setNotice((current) => ({
          ...current,
          loading: false,
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

  async function refreshProfile(nextUserId = userId) {
    if (!nextUserId) {
      return;
    }
    const nextProfile = await client.getDatingProfile(nextUserId);
    setProfile(nextProfile);
    setForm(profileToForm(nextProfile));
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
        isProfileComplete: Boolean(form.bio.trim() && form.city.trim() && primaryPhoto),
      });
      setProfile(updatedProfile);
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
      <section className="panel dating-profile-hero">
        <div className="section-head">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="dating-profile-status">
          <span>{copy.status}</span>
          <strong>{profile?.datingPublicationStatus || copy.draft}</strong>
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
          </div>
          <div className="dating-photo-actions">
            <label className="button dating-upload-button">
              <input accept="image/*" onChange={handlePhotoInput} type="file" />
              {copy.choosePhoto}
            </label>
            <p className="muted">{copy.photoHint}</p>
          </div>

          {photos.length ? (
            <div className="dating-photo-strip">
              {photos.map((photo) => (
                <img
                  alt={copy.photoAlt}
                  key={`${photo.ID || photo.id || photo.url}`}
                  src={client.getMediaUrl(photo.url)}
                />
              ))}
            </div>
          ) : null}
        </div>

        <form className="dating-form" onSubmit={handleSave}>
          {notice.error ? <div className="notice error-copy">{notice.error}</div> : null}
          {notice.success ? <div className="notice success">{notice.success}</div> : null}
          {notice.loading ? <div className="notice">{copy.loading}</div> : null}

          <label className="field">
            <span>{copy.city}</span>
            <input onChange={(event) => setForm({ ...form, city: event.target.value })} value={form.city} />
          </label>

          <label className="field">
            <span>{copy.bio}</span>
            <textarea onChange={(event) => setForm({ ...form, bio: event.target.value })} value={form.bio} />
          </label>

          <label className="field">
            <span>{copy.interests}</span>
            <textarea onChange={(event) => setForm({ ...form, interests: event.target.value })} value={form.interests} />
          </label>

          <label className="field">
            <span>{copy.lookingFor}</span>
            <textarea onChange={(event) => setForm({ ...form, lookingFor: event.target.value })} value={form.lookingFor} />
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
                onClick={() => setForm({ ...form, intentions: value })}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <label className="dating-toggle">
            <input
              checked={form.datingEnabled}
              onChange={(event) => setForm({ ...form, datingEnabled: event.target.checked })}
              type="checkbox"
            />
            <span>{copy.enableProfile}</span>
          </label>

          <div className="actions">
            <button className="button" disabled={notice.loading} type="submit">
              {notice.loading ? copy.saving : copy.save}
            </button>
            <button className="button-secondary" disabled={notice.submitLoading || !primaryPhoto} onClick={() => void handleSubmitForReview()} type="button">
              {notice.submitLoading ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      </section>

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
    </div>
  );
}
