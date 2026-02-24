import { useState } from "react";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("johan@example.com");
  const [password, setPassword] = useState("SterktPassord123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.accessToken);
      onLoggedIn();
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>StudyOps</h1>
      <p>Logg inn</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label>
          Passord
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button disabled={loading} style={{ padding: 10 }}>
          {loading ? "Logger inn..." : "Login"}
        </button>

        {error && <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{error}</pre>}
      </form>
    </div>
  );
}