"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import { useSession } from "@/components/session-context";

export function ProfileForm() {
  const { dictionary, session, setSession } = useSession();
  const [form, setForm] = useState({
    karmicName: "",
    spiritualName: "",
    nickname: "",
    city: "",
    country: "",
    identity: "",
  });
  const [state, setState] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    setForm({
      karmicName: session?.user?.karmicName || "",
      spiritualName: session?.user?.spiritualName || "",
      nickname: session?.user?.nickname || "",
      city: session?.user?.city || "",
      country: session?.user?.country || "",
      identity: session?.user?.identity || "",
    });
  }, [session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, error: "", success: "" });
    try {
      const nextSession = await createBrowserClient().updateProfile(form);
      setSession(nextSession);
      setState({ loading: false, error: "", success: dictionary.profile.updated });
    } catch (submitError) {
      setState({
        loading: false,
        error: submitError instanceof Error ? submitError.message : dictionary.profile.updateFailed,
        success: "",
      });
    }
  }

  return (
    <div className="panel page-card">
      <h1>{dictionary.profile.title}</h1>
      <p className="muted">{dictionary.profile.subtitle}</p>
      <form className="form-grid" onSubmit={handleSubmit}>
        {state.error ? <div className="notice">{state.error}</div> : null}
        {state.success ? <div className="notice success">{state.success}</div> : null}
        <div className="split">
          <label className="field">
            <span>{dictionary.profile.karmicName}</span>
            <input onChange={(event) => setForm({ ...form, karmicName: event.target.value })} value={form.karmicName} />
          </label>
          <label className="field">
            <span>{dictionary.profile.spiritualName}</span>
            <input onChange={(event) => setForm({ ...form, spiritualName: event.target.value })} value={form.spiritualName} />
          </label>
        </div>
        <div className="split">
          <label className="field">
            <span>{dictionary.profile.nickname}</span>
            <input onChange={(event) => setForm({ ...form, nickname: event.target.value })} value={form.nickname} />
          </label>
          <label className="field">
            <span>{dictionary.profile.identity}</span>
            <input onChange={(event) => setForm({ ...form, identity: event.target.value })} value={form.identity} />
          </label>
        </div>
        <div className="split">
          <label className="field">
            <span>{dictionary.profile.city}</span>
            <input onChange={(event) => setForm({ ...form, city: event.target.value })} value={form.city} />
          </label>
          <label className="field">
            <span>{dictionary.profile.country}</span>
            <input onChange={(event) => setForm({ ...form, country: event.target.value })} value={form.country} />
          </label>
        </div>
        <button className="button" disabled={state.loading} type="submit">
          {state.loading ? dictionary.profile.saving : dictionary.profile.save}
        </button>
      </form>
    </div>
  );
}
