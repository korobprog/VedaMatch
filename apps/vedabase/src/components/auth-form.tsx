"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import { useSession } from "@/components/session-context";
import { TopBar } from "@/components/top-bar";
import { t } from "@/lib/copy";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { language, setSession } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const client = createBrowserClient();
      const session = isLogin
        ? await client.login({ email, password })
        : await client.register({ email, password });
      setSession(session);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(language, "Не удалось выполнить запрос", "Request failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar />
      <div className="vb-auth">
        <h1>{isLogin ? t(language, "Вход", "Sign in") : t(language, "Регистрация", "Create account")}</h1>
        <p className="vb-muted">
          {t(
            language,
            "Единый аккаунт VedaMatch — знакомства, портал и библиотека.",
            "One VedaMatch account — Union, portal and the library.",
          )}
        </p>
        <form onSubmit={submit}>
          <div className="vb-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="vb-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="vb-field">
            <label htmlFor="password">{t(language, "Пароль", "Password")}</label>
            <input
              id="password"
              className="vb-input"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="vb-error">{error}</p>}
          <button className="vb-btn vb-btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy
              ? t(language, "Подождите…", "Please wait…")
              : isLogin
                ? t(language, "Войти", "Sign in")
                : t(language, "Создать аккаунт", "Create account")}
          </button>
        </form>
        <p className="vb-muted" style={{ marginTop: 18 }}>
          {isLogin ? (
            <>
              {t(language, "Нет аккаунта?", "No account?")} <Link href="/register">{t(language, "Регистрация", "Register")}</Link>
            </>
          ) : (
            <>
              {t(language, "Уже есть аккаунт?", "Already registered?")} <Link href="/login">{t(language, "Войти", "Sign in")}</Link>
            </>
          )}
        </p>
      </div>
    </>
  );
}
