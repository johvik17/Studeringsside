import { useState } from "react";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import { THEMES } from "../lib/theme";
import type { ThemeName } from "../lib/theme";

type Mode = "login" | "register";

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function LoginPage({
  onLoggedIn,
  onThemeChange,
  theme,
}: {
  onLoggedIn: () => void;
  onThemeChange: (theme: ThemeName) => void;
  theme: ThemeName;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("johan@example.com");
  const [password, setPassword] = useState("SterktPassord123");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "register") {
        await api.register(email, password);
        setNotice("Brukeren er opprettet. Logger deg inn...");
      }

      const res = await api.login(email, password);
      setToken(res.accessToken);
      onLoggedIn();
    } catch (err: unknown) {
      setError(messageFromError(err, mode === "login" ? "Login feilet" : "Registrering feilet"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label="StudyOps">
        <div className="brand-mark">SO</div>
        <div className="theme-picker auth-theme-picker" aria-label="Velg fargetema">
          {THEMES.map((item) => (
            <button
              aria-label={item.label}
              className={theme === item.name ? "active" : ""}
              key={item.name}
              onClick={() => onThemeChange(item.name)}
              title={item.label}
              type="button"
            >
              <span style={{ background: item.colors[0] }} />
              <span style={{ background: item.colors[1] }} />
            </button>
          ))}
        </div>
        <p className="eyebrow">StudyOps</p>
        <h1>Hold fokus, logg øktene, se progresjonen.</h1>
        <p className="hero-copy">
          En rolig mørk arbeidsflate for pomodoro, deep work, lesing og koding.
        </p>
        <div className="hero-metrics" aria-label="App highlights">
          <div>
            <strong>4</strong>
            <span>øktstyper</span>
          </div>
          <div>
            <strong>30d</strong>
            <span>oversikt</span>
          </div>
          <div>
            <strong>JWT</strong>
            <span>sikker API</span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label={mode === "login" ? "Logg inn" : "Opprett bruker"}>
        <div className="auth-tabs" role="tablist" aria-label="Velg innlogging eller registrering">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Logg inn
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            Opprett
          </button>
        </div>

        <div className="panel-heading">
          <p className="eyebrow">{mode === "login" ? "Velkommen tilbake" : "Kom i gang"}</p>
          <h2>{mode === "login" ? "Logg inn på kontoen din" : "Lag en StudyOps-bruker"}</h2>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <label>
            <span>E-post</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            <span>Passord</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Jobber..." : mode === "login" ? "Logg inn" : "Opprett og logg inn"}
          </button>

          {notice && <div className="notice success">{notice}</div>}
          {error && <div className="notice error">{error}</div>}
        </form>
      </section>
    </main>
  );
}
