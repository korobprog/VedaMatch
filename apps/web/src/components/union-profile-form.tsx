"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Save, Send } from "lucide-react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingProfile, DatingSocialLink } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

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
  const [form, setForm] = useState<UnionProfileFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    client.getDatingProfile(currentUserId).then((profile) => {
      setForm(profileToForm(profile));
      setError("");
    }).catch(() => {
      setForm(EMPTY_FORM);
    }).finally(() => {
      setLoading(false);
    });
  }, [client, currentUserId]);

  function updateField(field: keyof UnionProfileFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
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
        bio: form.bio,
        city: form.city,
        country: form.country,
        madh: form.madh,
        identity: form.identity,
        intentions: form.intentions,
        interests: form.interests,
        skills: form.skills,
        industry: form.industry,
        lookingFor: form.lookingFor,
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

      {loading ? <div className="empty-state">{dictionary.common.loading}</div> : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice">{error}</div> : null}

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
          <label className="field">
            <span>{copy.city}</span>
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.country}</span>
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.madh}</span>
            <input value={form.madh} onChange={(event) => updateField("madh", event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.identity}</span>
            <input value={form.identity} onChange={(event) => updateField("identity", event.target.value)} />
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
    </div>
  );
}
