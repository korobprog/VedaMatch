"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Apple, Download, Smartphone } from "lucide-react";
import { createBrowserClient } from "@vedamatch/api-client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-context";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { MobileAppConfig } from "@/lib/mobile-app-config";

type LoginFormProps = {
  entryVariant?: "default" | "social";
  mobileAppConfig: MobileAppConfig;
};

export function LoginForm({ entryVariant = "default", mobileAppConfig }: LoginFormProps) {
  const router = useRouter();
  const { dictionary, language, setSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });
  const hasAnyDownload = Boolean(mobileAppConfig.androidUrl || mobileAppConfig.iosUrl);
  const commonCopy = language === "ru"
    ? { noAccount: "Еще нет аккаунта?" }
    : { noAccount: "No account yet?" };
  const socialCopy = language === "ru"
    ? {
      eyebrow: "Social вход",
      body: "Войди в social web entrypoint и продолжи работу внутри общего launcher-а VedaMatch.",
      footer: "Еще нет аккаунта?",
      cta: "Создать social web аккаунт",
    }
    : {
      eyebrow: "Social sign in",
      body: "Sign in to the social web entrypoint, then continue into the shared VedaMatch launcher.",
      footer: "No account yet?",
      cta: "Create a social web account",
    };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, error: "" });

    try {
      const session = await createBrowserClient().login({ email, password });
      setSession(session);
      router.push("/app");
    } catch (submitError) {
      setState({
        loading: false,
        error: submitError instanceof Error ? submitError.message : dictionary.common.error,
      });
      return;
    }

    setState({ loading: false, error: "" });
  }

  return (
    <main className={entryVariant === "social" ? "shell shell--dashboard" : "shell"}>
      <div className="container" style={{ padding: "72px 0" }}>
        {entryVariant === "social" ? (
          <div className="auth-surface-bar">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        ) : null}
        <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="panel-inner stack">
            <div className="section-head">
              <span className="eyebrow">{entryVariant === "social" ? socialCopy.eyebrow : dictionary.auth.loginTitle}</span>
              <h1>{dictionary.auth.loginTitle}</h1>
              <p>
                {entryVariant === "social"
                  ? socialCopy.body
                  : dictionary.portal.subtitle}
              </p>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              {state.error ? <div className="notice">{state.error}</div> : null}
              <label className="field">
                <span>{dictionary.auth.email}</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label className="field">
                <span>{dictionary.auth.password}</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <button className="button" disabled={state.loading} type="submit">
                {state.loading ? dictionary.common.loading : dictionary.auth.submitLogin}
              </button>
            </form>
            <p className="muted">
              {entryVariant === "social" ? socialCopy.footer : commonCopy.noAccount}&nbsp;
              <Link href="/register">{entryVariant === "social" ? socialCopy.cta : dictionary.nav.register}</Link>
            </p>
          </div>
        </div>
        {hasAnyDownload ? (
          <section className="mobile-download-card" aria-label={dictionary.auth.mobilePromo.title}>
            <div className="mobile-download-card__head">
              <span className="mobile-download-card__eyebrow">{dictionary.auth.mobilePromo.eyebrow}</span>
              <h2>{dictionary.auth.mobilePromo.title}</h2>
              <p>{dictionary.auth.mobilePromo.body}</p>
            </div>
            <div className="mobile-download-card__grid">
              {mobileAppConfig.androidUrl ? (
                <a className="mobile-download-button mobile-download-button--android" href={mobileAppConfig.androidUrl} rel="noreferrer" target="_blank">
                  <span className="mobile-download-button__icon" aria-hidden="true">
                    <Smartphone size={22} />
                  </span>
                  <span className="mobile-download-button__copy">
                    <strong>{dictionary.auth.mobilePromo.androidLabel}</strong>
                    <span>{dictionary.auth.mobilePromo.androidHint}</span>
                  </span>
                  <span className="mobile-download-button__meta">
                    {mobileAppConfig.androidVersion ? (
                      <span>{dictionary.auth.mobilePromo.versionLabel}: {mobileAppConfig.androidVersion}</span>
                    ) : null}
                    <Download size={18} />
                  </span>
                </a>
              ) : null}
              {mobileAppConfig.iosUrl ? (
                <a className="mobile-download-button mobile-download-button--ios" href={mobileAppConfig.iosUrl} rel="noreferrer" target="_blank">
                  <span className="mobile-download-button__icon" aria-hidden="true">
                    <Apple size={22} />
                  </span>
                  <span className="mobile-download-button__copy">
                    <strong>{dictionary.auth.mobilePromo.iosLabel}</strong>
                    <span>{dictionary.auth.mobilePromo.iosHint}</span>
                  </span>
                  <span className="mobile-download-button__meta">
                    {mobileAppConfig.iosVersion ? (
                      <span>{dictionary.auth.mobilePromo.versionLabel}: {mobileAppConfig.iosVersion}</span>
                    ) : null}
                    <Download size={18} />
                  </span>
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
