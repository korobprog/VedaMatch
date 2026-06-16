"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronDown, Eye, EyeOff, ImageIcon, Plus, Save, Send, Trash2, Upload } from "lucide-react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingProfile, DatingSocialLink, UserMedia } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";
import { getMediaId, resolveApiMediaUrl } from "@/lib/media";
import { UnionNotice } from "@/components/union-notice";
import { UnionSkeleton } from "@/components/union-skeleton";

type UnionProfileFormState = {
  datingEnabled: boolean;
  bio: string;
  city: string;
  country: string;
  madh: string;
  identity: string;
  intentions: string;
  interests: string;
  skills: string;
  industry: string;
  lookingFor: string;
  datingPublicationStatus: string;
  socialLinks: DatingSocialLink[];
};

const SOCIAL_PLATFORMS = ["vk", "telegram", "instagram", "youtube", "facebook", "x"] as const;
const MADH_OPTIONS = [
  "ISKCON",
  "Brahma-Madhva-Gaudiya",
  "Sri Sampradaya (Ramanuja)",
  "Brahma Sampradaya (Madhvacharya)",
  "Rudra Sampradaya (Vishnuswami)",
  "Kumara Sampradaya (Nimbarka)",
  "Шри Чайтанья Сарасват Матх",
  "Международное Общество Чистой Бхакти-йоги",
  "Шри Гопинатх Гаудия",
  "Шри Чайтанья Матх",
  "Other",
] as const;
const IDENTITY_OPTIONS = ["Yogi", "In Goodness"] as const;

const EMPTY_FORM: UnionProfileFormState = {
  datingEnabled: true,
  bio: "",
  city: "",
  country: "",
  madh: "",
  identity: "",
  intentions: "",
  interests: "",
  skills: "",
  industry: "",
  lookingFor: "",
  datingPublicationStatus: "",
  socialLinks: SOCIAL_PLATFORMS.map((platform) => ({ platform, url: "", visible: true })),
};

function readProfileValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function uniqueOptions(options: string[]): string[] {
  return Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));
}

function mergeCurrentOption(options: readonly string[], currentValue: string): string[] {
  const normalizedCurrent = currentValue.trim();
  if (!normalizedCurrent || options.some((option) => option.toLowerCase() === normalizedCurrent.toLowerCase())) {
    return [...options];
  }
  return [normalizedCurrent, ...options];
}

function optionLabel(value: string, labels: Record<string, string>): string {
  return labels[value] || value;
}

async function fetchLocationOptions(
  kind: "cities" | "countries",
  options: { accessToken?: string; country?: string; q?: string; signal?: AbortSignal },
): Promise<string[]> {
  const params = new URLSearchParams({ limit: "8" });
  const query = options.q?.trim();
  const country = options.country?.trim();
  if (query) {
    params.set("q", query);
  }
  if (country) {
    params.set("country", country);
  }

  const response = await fetch(`/api/locations/${kind}?${params.toString()}`, {
    cache: "no-store",
    headers: options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : undefined,
    signal: options.signal,
  });
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return uniqueOptions(Array.isArray(payload?.options) ? payload.options.map(String) : []);
}

function mergeSocialLinks(profileLinks: DatingSocialLink[] | undefined): DatingSocialLink[] {
  const byPlatform = new Map((profileLinks || []).map((link) => [link.platform, link]));
  return SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    url: byPlatform.get(platform)?.url || "",
    visible: byPlatform.get(platform)?.visible !== false,
  }));
}

function profileToForm(profile: DatingProfile | null): UnionProfileFormState {
  if (!profile) {
    return EMPTY_FORM;
  }

  return {
    datingEnabled: profile.datingEnabled !== false,
    bio: readProfileValue(profile.bio),
    city: readProfileValue(profile.city),
    country: readProfileValue(profile.country),
    madh: readProfileValue(profile.madh),
    identity: readProfileValue(profile.identity),
    intentions: readProfileValue(profile.intentions),
    interests: readProfileValue(profile.interests),
    skills: readProfileValue(profile.skills),
    industry: readProfileValue(profile.industry),
    lookingFor: readProfileValue(profile.lookingFor),
    datingPublicationStatus: readProfileValue(profile.datingPublicationStatus),
    socialLinks: mergeSocialLinks(profile.datingSocialLinks),
  };
}

export function UnionProfileForm() {
  const { dictionary, session } = useSession();
  const copy = dictionary.union;
  const client = useMemo(() => createBrowserClient(), []);
  const currentUserId = session?.user?.ID || session?.user?.id || 0;
  const accessToken = session?.accessToken || "";
  const [form, setForm] = useState<UnionProfileFormState>(EMPTY_FORM);
  const [photos, setPhotos] = useState<UserMedia[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mediaActionId, setMediaActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const cityBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countryBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortedPhotos = useMemo(
    () => [...photos].sort((left, right) => Number(right.isProfile === true) - Number(left.isProfile === true)),
    [photos],
  );
  const mergedCityOptions = useMemo(
    () => mergeCurrentOption(cityOptions, form.city),
    [cityOptions, form.city],
  );
  const mergedCountryOptions = useMemo(
    () => mergeCurrentOption(countryOptions, form.country),
    [countryOptions, form.country],
  );
  const madhOptions = useMemo(
    () => mergeCurrentOption(MADH_OPTIONS, form.madh),
    [form.madh],
  );
  const identityOptions = useMemo(
    () => mergeCurrentOption(IDENTITY_OPTIONS, form.identity),
    [form.identity],
  );
  const visibleCountryOptions = useMemo(() => {
    return countryOptions.length > 0 ? countryOptions.slice(0, 8) : mergedCountryOptions.slice(0, 8);
  }, [countryOptions, mergedCountryOptions]);
  const visibleCityOptions = useMemo(() => {
    const query = form.city.trim().toLowerCase();
    const options = cityOptions.length > 0 ? cityOptions : mergedCityOptions;
    // Когда введённый текст точно совпадает с городом, не подсказываем его снова:
    // иначе единственной подсказкой оказывается уже выбранный город и список
    // «сам» всплывает, предлагая стереть значение.
    const filtered = query ? options.filter((city) => city.toLowerCase() !== query) : options;
    return filtered.slice(0, 8);
  }, [cityOptions, form.city, mergedCityOptions]);
  const cityInputValue = cityOpen ? form.city : optionLabel(form.city, copy.optionLabels.cities);
  const countryInputValue = countryOpen ? form.country : optionLabel(form.country, copy.optionLabels.countries);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setPhotosLoading(true);
    Promise.allSettled([
      client.getDatingProfile(currentUserId),
      client.listUserMedia(currentUserId),
    ]).then(([profileResult, photosResult]) => {
      if (!active) {
        return;
      }
      if (profileResult.status === "fulfilled") {
        setForm(profileToForm(profileResult.value));
        setError("");
      } else {
        setForm(EMPTY_FORM);
      }
      if (photosResult.status === "fulfilled") {
        setPhotos(photosResult.value);
      } else {
        setPhotos([]);
      }
    }).finally(() => {
      if (active) {
        setLoading(false);
        setPhotosLoading(false);
      }
    });

    return () => {
      active = false;
      if (cityBlurTimer.current) {
        clearTimeout(cityBlurTimer.current);
      }
      if (countryBlurTimer.current) {
        clearTimeout(countryBlurTimer.current);
      }
    };
  }, [client, currentUserId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchLocationOptions("countries", { q: form.country, signal: controller.signal })
        .then((options) => setCountryOptions(options))
        .catch(() => {
          if (!controller.signal.aborted) {
            setCountryOptions([]);
          }
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.country]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchLocationOptions("cities", {
        accessToken,
        country: form.country,
        q: form.city,
        signal: controller.signal,
      })
        .then((options) => setCityOptions(options))
        .catch(() => {
          if (!controller.signal.aborted) {
            setCityOptions([]);
          }
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, form.city, form.country]);

  function updateField(field: keyof UnionProfileFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCity(value: string, open = true) {
    updateField("city", value);
    setCityOpen(open);
  }

  function updateCountry(value: string, open = true) {
    updateField("country", value);
    setCountryOpen(open);
  }

  function updateSocialLink(index: number, patch: Partial<DatingSocialLink>) {
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link, itemIndex) => itemIndex === index ? { ...link, ...patch } : link),
    }));
  }

  function addSocialLink() {
    setForm((current) => ({
      ...current,
      socialLinks: [...current.socialLinks, { platform: "telegram", url: "", visible: true }],
    }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUserId) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await client.updateDatingProfile(currentUserId, {
        datingEnabled: form.datingEnabled,
        bio: form.bio.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        madh: form.madh.trim(),
        identity: form.identity.trim(),
        intentions: form.intentions.trim(),
        interests: form.interests.trim(),
        skills: form.skills.trim(),
        industry: form.industry.trim(),
        lookingFor: form.lookingFor.trim(),
        socialLinks: form.socialLinks.filter((link) => link.url.trim()).map((link) => ({
          platform: link.platform,
          url: link.url.trim(),
          visible: link.visible !== false,
        })),
      });
      const nextProfile = await client.getDatingProfile(currentUserId);
      setForm(profileToForm(nextProfile));
      setNotice(copy.profileSaved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.actionFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitProfile() {
    if (!currentUserId) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await client.submitDatingProfile(currentUserId);
      const nextProfile = await client.getDatingProfile(currentUserId);
      setForm(profileToForm(nextProfile));
      setNotice(copy.profileSubmitted);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.actionFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !currentUserId) {
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setNotice("");
    try {
      const uploaded = await client.uploadUserPhoto(currentUserId, file);
      const uploadedId = getMediaId(uploaded);
      if (uploadedId) {
        await client.setProfilePhoto(uploadedId);
      }
      const nextPhotos = await client.listUserMedia(currentUserId);
      setPhotos(nextPhotos);
      setNotice(copy.photoUploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : copy.actionFailed);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSetMainPhoto(photo: UserMedia) {
    const photoId = getMediaId(photo);
    if (!photoId || !currentUserId) {
      return;
    }

    setMediaActionId(photoId);
    setError("");
    setNotice("");
    try {
      await client.setProfilePhoto(photoId);
      const nextPhotos = await client.listUserMedia(currentUserId);
      setPhotos(nextPhotos);
      setNotice(copy.mainPhotoUpdated);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : copy.actionFailed);
    } finally {
      setMediaActionId(null);
    }
  }

  async function handleDeletePhoto(photo: UserMedia) {
    const photoId = getMediaId(photo);
    if (!photoId || !currentUserId) {
      return;
    }

    setMediaActionId(photoId);
    setError("");
    setNotice("");
    try {
      await client.deleteUserMedia(photoId);
      const nextPhotos = await client.listUserMedia(currentUserId);
      setPhotos(nextPhotos);
      setNotice(copy.photoDeleted);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : copy.actionFailed);
    } finally {
      setMediaActionId(null);
    }
  }

  return (
    <div className="union-page">
      <section className="union-hero union-hero--compact">
        <div className="union-hero__copy">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.profileTitle}</h1>
          <p>{copy.profileSubtitle}</p>
        </div>
        <div className="union-hero__actions">
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union">
            {copy.title}
          </Link>
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union/requests">
            {copy.requests}
          </Link>
        </div>
      </section>

      <span className="union-visually-hidden" role="status" aria-live="polite">
        {loading ? dictionary.common.loading : ""}
      </span>
      {loading ? <UnionSkeleton variant="form" /> : null}
      <UnionNotice tone="success">{notice}</UnionNotice>
      <UnionNotice tone="error">{error}</UnionNotice>

      {loading ? null : (
      <form className="union-profile-form" onSubmit={handleSave}>
        <div className="union-profile-form__main">
          <label className="union-toggle">
            <input checked={form.datingEnabled} onChange={(event) => updateField("datingEnabled", event.target.checked)} type="checkbox" />
            <span>{copy.datingEnabled}</span>
          </label>
          <label className="field union-field-wide">
            <span>{copy.bio}</span>
            <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} />
          </label>
          <div className="field">
            <span>{copy.city}</span>
            <div className="union-combobox">
              <input
                autoComplete="off"
                value={cityInputValue}
                onFocus={() => setCityOpen(form.city.trim().length > 0)}
                onBlur={() => {
                  cityBlurTimer.current = setTimeout(() => setCityOpen(false), 120);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && cityOpen) {
                    event.stopPropagation();
                    setCityOpen(false);
                  }
                }}
                onChange={(event) => updateCity(event.target.value)}
              />
              <button
                aria-expanded={cityOpen}
                aria-label={copy.showCityOptions}
                className="union-combobox__toggle"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setCityOpen((current) => !current)}
                type="button"
              >
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {cityOpen && visibleCityOptions.length > 0 ? (
                <div className="union-combobox__list" role="listbox">
                  {visibleCityOptions.map((city) => (
                    <button
                      className="union-combobox__option"
                      key={city}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => updateCity(city, false)}
                      role="option"
                      type="button"
                    >
                      {optionLabel(city, copy.optionLabels.cities)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="field">
            <span>{copy.country}</span>
            <div className="union-combobox">
              <input
                autoComplete="off"
                value={countryInputValue}
                onFocus={() => setCountryOpen(form.country.trim().length > 0)}
                onBlur={() => {
                  countryBlurTimer.current = setTimeout(() => setCountryOpen(false), 120);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && countryOpen) {
                    event.stopPropagation();
                    setCountryOpen(false);
                  }
                }}
                onChange={(event) => updateCountry(event.target.value)}
              />
              <button
                aria-expanded={countryOpen}
                aria-label={copy.country}
                className="union-combobox__toggle"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setCountryOpen((current) => !current)}
                type="button"
              >
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {countryOpen && visibleCountryOptions.length > 0 ? (
                <div className="union-combobox__list" role="listbox">
                  {visibleCountryOptions.map((country) => (
                    <button
                      className="union-combobox__option"
                      key={country}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => updateCountry(country, false)}
                      role="option"
                      type="button"
                    >
                      {optionLabel(country, copy.optionLabels.countries)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <label className="field">
            <span>{copy.madh}</span>
            <select value={form.madh} onChange={(event) => updateField("madh", event.target.value)}>
              <option value="">-</option>
              {madhOptions.map((option) => (
                <option key={option} value={option}>{optionLabel(option, copy.optionLabels.madh)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{copy.identity}</span>
            <select value={form.identity} onChange={(event) => updateField("identity", event.target.value)}>
              <option value="">-</option>
              {identityOptions.map((option) => (
                <option key={option} value={option}>{optionLabel(option, copy.optionLabels.identity)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{copy.intentions}</span>
            <input value={form.intentions} onChange={(event) => updateField("intentions", event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.interests}</span>
            <input value={form.interests} onChange={(event) => updateField("interests", event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.skills}</span>
            <input value={form.skills} onChange={(event) => updateField("skills", event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.industry}</span>
            <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
          </label>
          <label className="field union-field-wide">
            <span>{copy.details}</span>
            <input value={form.lookingFor} onChange={(event) => updateField("lookingFor", event.target.value)} />
          </label>
          <div className="union-profile-status">
            <span>{copy.publicationStatus}</span>
            <strong>{form.datingPublicationStatus || copy.hidden}</strong>
          </div>
        </div>

        <section className="union-photo-editor" aria-label={copy.photos}>
          <div className="union-section-head">
            <div>
              <h2>{copy.photos}</h2>
              <p>{copy.photosHint}</p>
            </div>
            <label className="button-secondary union-photo-upload">
              <Upload aria-hidden="true" size={18} />
              {uploadingPhoto ? copy.uploadingPhoto : copy.uploadPhoto}
              <input accept="image/*" disabled={uploadingPhoto} onChange={(event) => void handlePhotoUpload(event)} type="file" />
            </label>
          </div>
          {photosLoading ? <div className="empty-state">{dictionary.common.loading}</div> : null}
          {!photosLoading && sortedPhotos.length === 0 ? (
            <div className="union-photo-empty">
              <ImageIcon aria-hidden="true" size={32} />
              <span>{copy.noPhotos}</span>
            </div>
          ) : null}
          {sortedPhotos.length > 0 ? (
            <div className="union-photo-grid">
              {sortedPhotos.map((photo) => {
                const photoId = getMediaId(photo);
                const actionBusy = mediaActionId === photoId;
                return (
                  <figure className="union-photo-item" key={photoId || photo.url}>
                    <img alt="" src={resolveApiMediaUrl(client.baseUrl, photo.url)} />
                    {photo.isProfile ? (
                      <figcaption className="union-photo-item__badge">
                        <Camera aria-hidden="true" size={14} />
                        {copy.mainPhoto}
                      </figcaption>
                    ) : null}
                    <div className="union-photo-item__actions">
                      <button
                        aria-label={copy.setMainPhoto}
                        className="union-photo-icon"
                        disabled={actionBusy || photo.isProfile}
                        onClick={() => void handleSetMainPhoto(photo)}
                        type="button"
                      >
                        <Check aria-hidden="true" size={16} />
                      </button>
                      <button
                        aria-label={copy.deletePhoto}
                        className="union-photo-icon union-photo-icon--danger"
                        disabled={actionBusy}
                        onClick={() => void handleDeletePhoto(photo)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </figure>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="union-social-editor" aria-label={copy.socialLinks}>
          <div className="union-section-head">
            <h2>{copy.socialLinks}</h2>
            <button className="button-secondary" onClick={addSocialLink} type="button">
              <Plus aria-hidden="true" size={18} />
              {copy.addSocialLink}
            </button>
          </div>
          <div className="union-social-editor__list">
            {form.socialLinks.map((link, index) => (
              <div className="union-social-row" key={`${link.platform}-${index}`}>
                <label className="field">
                  <span>{copy.platform}</span>
                  <select value={link.platform} onChange={(event) => updateSocialLink(index, { platform: event.target.value })}>
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{copy.socialLinkUrl}</span>
                  <input value={link.url} onChange={(event) => updateSocialLink(index, { url: event.target.value })} />
                </label>
                <label className="union-toggle union-toggle--inline">
                  <input checked={link.visible !== false} onChange={(event) => updateSocialLink(index, { visible: event.target.checked })} type="checkbox" />
                  {link.visible !== false ? <Eye aria-hidden="true" size={18} /> : <EyeOff aria-hidden="true" size={18} />}
                  <span>{link.visible !== false ? copy.visible : copy.hidden}</span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <div className="union-form-actions">
          <button className="button" disabled={saving} type="submit">
            <Save aria-hidden="true" size={18} />
            {copy.saveProfile}
          </button>
          <button className="button-secondary" disabled={saving} onClick={() => void handleSubmitProfile()} type="button">
            <Send aria-hidden="true" size={18} />
            {copy.submitProfile}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
