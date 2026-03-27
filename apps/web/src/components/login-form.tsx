"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import { useSession } from "@/components/session-context";

type LoginFormProps = {
  entryVariant?: "default" | "social";
};

export function LoginForm({ entryVariant = "default" }: LoginFormProps) {
  const router = useRouter();
  const { dictionary, setSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });

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
    <main className="shell">
      <div className="container" style={{ padding: "72px 0" }}>
        <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="panel-inner stack">
            <div className="section-head">
              <span className="eyebrow">{entryVariant === "social" ? "Social sign in" : dictionary.auth.loginTitle}</span>
              <h1>{dictionary.auth.loginTitle}</h1>
              <p>
                {entryVariant === "social"
                  ? "Sign in to the social web entrypoint, then continue into the shared VedaMatch shell."
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
              No account yet? <Link href="/register">{entryVariant === "social" ? "Create a social web account" : dictionary.nav.register}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
