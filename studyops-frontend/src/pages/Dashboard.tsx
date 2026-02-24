import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Session, DailySummary, TypeSummary, SessionType } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";

const TYPES: SessionType[] = ["DEEP_WORK", "POMODORO", "READING", "CODING"];

export function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const token = useMemo(() => getToken(), []);
  const [me, setMe] = useState<{ email: string; uid: number } | null>(null);

  const [active, setActive] = useState<Session | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);
  const [daily, setDaily] = useState<DailySummary[]>([]);
  const [byType, setByType] = useState<TypeSummary[]>([]);

  const [days, setDays] = useState(30);
  const [startType, setStartType] = useState<SessionType>("DEEP_WORK");
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    if (!token) return;
    setError(null);

    try {
      const [meRes, recentRes, dailyRes, byTypeRes] = await Promise.all([
        api.me(token),
        api.listSessions(token, days, 200),
        api.dailySummary(token, days),
        api.byTypeSummary(token, days),
      ]);

      setMe({ email: meRes.email, uid: meRes.uid });
      setRecent(recentRes);
      setDaily(dailyRes);
      setByType(byTypeRes);

      // active kan feile hvis “No active session” -> vi ignorerer og setter null
      try {
        const a = await api.activeSession(token);
        setActive(a);
      } catch {
        setActive(null);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load dashboard");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function start() {
    if (!token) return;
    setError(null);
    try {
      const s = await api.startSession(token, startType);
      setActive(s);
      await loadAll();
    } catch (err: any) {
      setError(err?.message ?? "Failed to start session");
    }
  }

  async function stop() {
    if (!token || !active) return;
    setError(null);
    try {
      const stopped = await api.stopSession(token, active.id);
      setActive(stopped.endTime ? null : stopped);
      await loadAll();
    } catch (err: any) {
      setError(err?.message ?? "Failed to stop session");
    }
  }

  function logout() {
    clearToken();
    onLogout();
  }

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>Dashboard</h1>
          {me && <small>{me.email} (uid={me.uid})</small>}
        </div>
        <button onClick={logout}>Logg ut</button>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          Days:&nbsp;
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
          </select>
        </label>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Session</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={startType} onChange={(e) => setStartType(e.target.value as SessionType)} disabled={!!active}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {!active ? (
            <button onClick={start}>Start</button>
          ) : (
            <>
              <button onClick={stop}>Stop</button>
              <small>
                Active: #{active.id} ({active.type}) started {new Date(active.startTime).toLocaleString()}
              </small>
            </>
          )}
        </div>

        {error && <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{error}</pre>}
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3>Daily minutes</h3>
          <ul>
            {daily.map((d) => (
              <li key={d.date}>
                {d.date}: {d.minutes}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Minutes by type</h3>
          <ul>
            {byType.map((x) => (
              <li key={x.type}>
                {x.type}: {x.minutes}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section>
        <h3>Recent sessions</h3>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>ID</th>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Min</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td>{s.id}</td>
                <td>{s.type}</td>
                <td>{new Date(s.startTime).toLocaleString()}</td>
                <td>{s.endTime ? new Date(s.endTime).toLocaleString() : "-"}</td>
                <td>{s.durationMinutes ?? "-"}</td>
                <td>{s.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}