"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-context";
import { ThemeSwitcher } from "@/components/theme-switcher";

type RegisterFormProps = {
  entryVariant?: "default" | "social";
};

export function RegisterForm({ entryVariant = "default" }: RegisterFormProps) {
  const router = useRouter();
  const { dictionary, language, setSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });
  const commonCopy = language === "ru"
    ? { haveAccount: "Уже есть аккаунт?" }
    : { haveAccount: "Already have an account?" };
  const socialCopy = language === "ru"
    ? {
      eyebrow: "Social регистрация",
      body: "Создай аккаунт в social web entrypoint и продолжи настройку внутри общего launcher-а VedaMatch.",
      footer: "Уже есть аккаунт?",
      cta: "Вернуться ко входу",
    }
    : {
      eyebrow: "Social registration",
      body: "Create an account on the social web entrypoint and continue into the shared VedaMatch launcher.",
      footer: "Already have an account?",
      cta: "Back to social sign in",
    };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, error: "" });

    try {
      const session = await createBrowserClient().register({ email, password });
      setSession(session);
      router.push("/app/profile");
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
              <span className="eyebrow">{entryVariant === "social" ? socialCopy.eyebrow : dictionary.auth.registerTitle}</span>
              <h1>{dictionary.auth.registerTitle}</h1>
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
                  autoComplete="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <button className="button" disabled={state.loading} type="submit">
                {state.loading ? dictionary.common.loading : dictionary.auth.submitRegister}
              </button>
            </form>
            <p className="muted">
              {entryVariant === "social" ? socialCopy.footer : commonCopy.haveAccount}&nbsp;
              <Link href="/login">{entryVariant === "social" ? socialCopy.cta : dictionary.nav.login}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
