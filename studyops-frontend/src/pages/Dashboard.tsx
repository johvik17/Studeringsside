import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Course, DailySummary, Session, SessionType, TypeSummary } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";
import { THEMES } from "../lib/theme";
import type { ThemeName } from "../lib/theme";

const TYPES: SessionType[] = ["DEEP_WORK", "POMODORO", "READING", "CODING"];
const WORK_SECONDS = 20 * 60;
const BREAK_SECONDS = 15 * 60;
const DAILY_GOAL_KEY = "studyops_daily_goal";

const RANKS = [
  { name: "Jern", xp: 0, color: "#94a3b8", icon: "Fe" },
  { name: "Bronse", xp: 300, color: "#cd7f32", icon: "Br" },
  { name: "Sølv", xp: 900, color: "#cbd5e1", icon: "Ag" },
  { name: "Gull", xp: 1800, color: "#facc15", icon: "Au" },
  { name: "Platinum", xp: 3200, color: "#67e8f9", icon: "Pt" },
  { name: "Emerald", xp: 5000, color: "#34d399", icon: "Em" },
  { name: "Diamant", xp: 7500, color: "#60a5fa", icon: "Di" },
];

const TYPE_LABELS: Record<SessionType, string> = {
  DEEP_WORK: "Deep work",
  POMODORO: "Pomodoro",
  READING: "Lesing",
  CODING: "Koding",
};

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function playTimerSound() {
  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const now = context.currentTime;
  const notes = [660, 880, 990];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + index * 0.18;
    const end = start + 0.14;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  });

  window.setTimeout(() => {
    void context.close();
  }, 900);
}

function totalMinutes(items: TypeSummary[]) {
  return items.reduce((sum, item) => sum + item.minutes, 0);
}

function courseName(courses: Course[], courseId: string | null) {
  if (!courseId) return "Uten fag";
  return courses.find((course) => course.id === courseId)?.name ?? "Ukjent fag";
}

function goalStreak(daily: DailySummary[], goal: number) {
  if (goal <= 0) return 0;

  let streak = 0;
  for (let index = daily.length - 1; index >= 0; index -= 1) {
    if (daily[index].minutes < goal) break;
    streak += 1;
  }

  return streak;
}

function goalDays(daily: DailySummary[], goal: number) {
  if (goal <= 0) return 0;
  return daily.filter((item) => item.minutes >= goal).length;
}

function xpFor({
  minutes,
  pomodoros,
  reachedGoalDays,
  streak,
}: {
  minutes: number;
  pomodoros: number;
  reachedGoalDays: number;
  streak: number;
}) {
  const streakBonus = Math.min(streak * 10, 100);
  return minutes + reachedGoalDays * 50 + pomodoros * 20 + streakBonus;
}

function rankFor(xp: number) {
  const current = [...RANKS].reverse().find((rank) => xp >= rank.xp) ?? RANKS[0];
  const currentIndex = RANKS.findIndex((rank) => rank.name === current.name);
  const next = RANKS[currentIndex + 1] ?? null;
  return { current, next };
}

function heatLevel(minutes: number, goal: number) {
  if (minutes <= 0) return 0;
  if (goal > 0 && minutes >= goal) return 4;
  if (minutes >= 120) return 4;
  if (minutes >= 75) return 3;
  if (minutes >= 30) return 2;
  return 1;
}

export function DashboardPage({
  onLogout,
  onThemeChange,
  theme,
}: {
  onLogout: () => void;
  onThemeChange: (theme: ThemeName) => void;
  theme: ThemeName;
}) {
  const token = useMemo(() => getToken(), []);
  const [me, setMe] = useState<{ email: string; uid: number } | null>(null);
  const [active, setActive] = useState<Session | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);
  const [daily, setDaily] = useState<DailySummary[]>([]);
  const [byType, setByType] = useState<TypeSummary[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [days, setDays] = useState(30);
  const [startType, setStartType] = useState<SessionType>("DEEP_WORK");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  const [timerSeconds, setTimerSeconds] = useState(WORK_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSessionId, setTimerSessionId] = useState<number | null>(null);
  const [dailyGoal, setDailyGoal] = useState(() =>
    Number(localStorage.getItem(DAILY_GOAL_KEY) ?? 120)
  );

  const minutes = totalMinutes(byType);
  const completedSessions = recent.filter((session) => session.endTime).length;
  const completedPomodoros = recent.filter(
    (session) => session.type === "POMODORO" && session.endTime
  ).length;
  const todayMinutes = daily.at(-1)?.minutes ?? 0;
  const dailyGoalProgress = Math.min((todayMinutes / Math.max(dailyGoal, 1)) * 100, 100);
  const streak = goalStreak(daily, dailyGoal);
  const goalReachedToday = todayMinutes >= dailyGoal && dailyGoal > 0;
  const reachedGoalDays = goalDays(daily, dailyGoal);
  const xp = xpFor({ minutes, pomodoros: completedPomodoros, reachedGoalDays, streak });
  const rank = rankFor(xp);
  const rankFloor = rank.current.xp;
  const nextRankXp = rank.next?.xp ?? rank.current.xp;
  const rankProgress = rank.next ? ((xp - rankFloor) / (nextRankXp - rankFloor)) * 100 : 100;
  const achievements = [
    {
      title: "Første økt",
      detail: "Startet studiehistorikken",
      unlocked: recent.length > 0,
    },
    {
      title: "Dagsmål nådd",
      detail: "Traff målet for en dag",
      unlocked: reachedGoalDays > 0,
    },
    {
      title: "3-dagers streak",
      detail: "Tre mål-dager på rad",
      unlocked: streak >= 3,
    },
    {
      title: "Pomodoro-pilot",
      detail: "Fullførte 5 pomodoroer",
      unlocked: completedPomodoros >= 5,
    },
    {
      title: "1000 minutter",
      detail: "La inn 1000 studie-minutter",
      unlocked: minutes >= 1000,
    },
    {
      title: "Fagbygger",
      detail: "Opprettet 3 fag",
      unlocked: courses.length >= 3,
    },
  ];
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const maxDaily = Math.max(...daily.map((item) => item.minutes), 1);
  const maxType = Math.max(...byType.map((item) => item.minutes), 1);
  const timerTotal = timerMode === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const timerProgress = ((timerTotal - timerSeconds) / timerTotal) * 100;

  async function loadAll() {
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      const [meRes, recentRes, dailyRes, byTypeRes, courseRes] = await Promise.all([
        api.me(token),
        api.listSessions(token, days, 200),
        api.dailySummary(token, days),
        api.byTypeSummary(token, days),
        api.listCourses(token),
      ]);

      setMe({ email: meRes.email, uid: meRes.uid });
      setRecent(recentRes);
      setDaily(dailyRes);
      setByType(byTypeRes);
      setCourses(courseRes);

      try {
        setActive(await api.activeSession(token));
      } catch {
        setActive(null);
      }
    } catch (err: unknown) {
      setError(messageFromError(err, "Kunne ikke laste dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    localStorage.setItem(DAILY_GOAL_KEY, String(dailyGoal));
  }, [dailyGoal]);

  useEffect(() => {
    if (!timerRunning) return;

    const intervalId = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current > 1) return current - 1;

        const nextMode = timerMode === "work" ? "break" : "work";
        playTimerSound();
        if (timerMode === "work" && timerSessionId) {
          void stopTimerSession(timerSessionId);
        }
        setTimerMode(nextMode);
        return nextMode === "work" ? WORK_SECONDS : BREAK_SECONDS;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode, timerRunning, timerSessionId]);

  async function start() {
    if (!token) return;
    setError(null);
    setWorking(true);
    try {
      const session = await api.startSession(
        token,
        startType,
        notes.trim() || undefined,
        selectedCourseId || null
      );
      setActive(session);
      setNotes("");
      await loadAll();
    } catch (err: unknown) {
      setError(messageFromError(err, "Kunne ikke starte økt"));
    } finally {
      setWorking(false);
    }
  }

  async function stop() {
    if (!token || !active) return;
    setError(null);
    setWorking(true);
    try {
      const stopped = await api.stopSession(token, active.id);
      setActive(stopped.endTime ? null : stopped);
      if (timerSessionId === stopped.id) setTimerSessionId(null);
      await loadAll();
    } catch (err: unknown) {
      setError(messageFromError(err, "Kunne ikke stoppe økt"));
    } finally {
      setWorking(false);
    }
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newCourseName.trim()) return;
    setError(null);
    setWorking(true);
    try {
      const course = await api.createCourse(
        token,
        newCourseName.trim(),
        newCourseCode.trim() || undefined,
        "#38bdf8"
      );
      setCourses((current) => [...current, course].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCourseId(course.id);
      setNewCourseName("");
      setNewCourseCode("");
    } catch (err: unknown) {
      setError(messageFromError(err, "Kunne ikke opprette fag"));
    } finally {
      setWorking(false);
    }
  }

  async function deleteCourse(courseId: string) {
    if (!token) return;
    const course = courses.find((item) => item.id === courseId);
    const confirmed = window.confirm(
      `Slette ${course?.name ?? "dette faget"}? Tidligere økter beholdes, men mister fagkoblingen.`
    );
    if (!confirmed) return;

    setError(null);
    setWorking(true);
    try {
      await api.deleteCourse(token, courseId);
      setCourses((current) => current.filter((course) => course.id !== courseId));
      setSelectedCourseId((current) => (current === courseId ? "" : current));
    } catch (err: unknown) {
      setError(messageFromError(err, "Kunne ikke slette fag"));
    } finally {
      setWorking(false);
    }
  }

  async function stopTimerSession(sessionId: number) {
    if (!token) return;
    try {
      const stopped = await api.stopSession(token, sessionId);
      setTimerSessionId(null);
      setActive((current) => (current?.id === stopped.id ? null : current));
      await loadAll();
    } catch (err: unknown) {
      setError(messageFromError(err, "Pomodoro-økten ble ferdig, men kunne ikke stoppes automatisk"));
    }
  }

  async function toggleTimer() {
    if (timerRunning) {
      setTimerRunning(false);
      return;
    }

    if (timerMode === "work" && token && !active && !timerSessionId) {
      setError(null);
      try {
        const session = await api.startSession(
          token,
          "POMODORO",
          notes.trim() || "Pomodoro 20 min",
          selectedCourseId || null
        );
        setActive(session);
        setTimerSessionId(session.id);
        setNotes("");
        await loadAll();
      } catch (err: unknown) {
        setError(messageFromError(err, "Timeren startet ikke økten automatisk"));
      }
    }

    setTimerRunning(true);
  }

  function logout() {
    clearToken();
    onLogout();
  }

  function resetTimer(mode = timerMode) {
    setTimerRunning(false);
    setTimerMode(mode);
    setTimerSeconds(mode === "work" ? WORK_SECONDS : BREAK_SECONDS);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">StudyOps</p>
          <h1>Arbeidsflyt</h1>
          {me && <p className="muted">{me.email}</p>}
        </div>

        <div className="topbar-actions">
          <div className="theme-control">
            <span>Fargetema</span>
            <div className="theme-picker" aria-label="Velg fargetema">
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
          </div>
          <label className="select-control">
            <span>Periode</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7 dager</option>
              <option value={30}>30 dager</option>
              <option value={90}>90 dager</option>
            </select>
          </label>
          <label className="select-control goal-control">
            <span>Dagsmål</span>
            <input
              min={15}
              step={15}
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value) || 0)}
            />
          </label>
          <button className="ghost-button" onClick={logout} type="button">
            Logg ut
          </button>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <section className="dashboard-grid">
        <article className="session-panel">
          <div className="panel-heading">
            <p className="eyebrow">Nå</p>
            <h2>{active ? "Aktiv økt" : "Start en fokusøkt"}</h2>
          </div>

          {active ? (
            <div className="active-session">
              <div>
                <span className="status-dot" />
                <p>{TYPE_LABELS[active.type]}</p>
                <strong>Startet {formatDate(active.startTime)}</strong>
              </div>
              <p className="muted">{courseName(courses, active.courseId)}</p>
              {active.notes && <p className="muted">{active.notes}</p>}
              <button className="danger-action" disabled={working} onClick={stop} type="button">
                {working ? "Stopper..." : "Stopp økt"}
              </button>
            </div>
          ) : (
            <div className="start-controls">
              <div className="type-picker" role="radiogroup" aria-label="Velg økttype">
                {TYPES.map((type) => (
                  <button
                    className={startType === type ? "active" : ""}
                    key={type}
                    onClick={() => setStartType(type)}
                    type="button"
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              <label>
                <span>Fag</span>
                <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                  <option value="">Uten fag</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code} - ${course.name}` : course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Notat</span>
                <input
                  placeholder="Hva skal du jobbe med?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <button className="primary-action" disabled={working} onClick={start} type="button">
                {working ? "Starter..." : "Start økt"}
              </button>
            </div>
          )}
        </article>

        <article className="timer-panel">
          <div className="panel-heading">
            <p className="eyebrow">Pomodoro</p>
            <h2>{timerMode === "work" ? "20 min jobb" : "15 min pause"}</h2>
          </div>

          <div className="timer-face" aria-label="Pomodoro timer">
            <div
              className="timer-ring"
              style={{
                background: `conic-gradient(var(--accent) ${timerProgress}%, var(--accent-soft) 0)`,
              }}
            >
              <div>
                <strong>{formatTimer(timerSeconds)}</strong>
                <span>{timerMode === "work" ? "Fokus" : "Pause"}</span>
              </div>
            </div>
          </div>

          <div className="timer-actions">
            <button className="primary-action" onClick={toggleTimer} type="button">
              {timerRunning ? "Pause timer" : "Start timer"}
            </button>
            <button className="ghost-button" onClick={() => resetTimer()} type="button">
              Reset
            </button>
          </div>

          <div className="timer-switch">
            <button
              className={timerMode === "work" ? "active" : ""}
              onClick={() => resetTimer("work")}
              type="button"
            >
              Jobb
            </button>
            <button
              className={timerMode === "break" ? "active" : ""}
              onClick={() => resetTimer("break")}
              type="button"
            >
              Pause
            </button>
          </div>
        </article>

        <section className="stats-grid" aria-label="Nøkkeltall">
          <div className="stat-card rank-card">
            <span>Rank</span>
            <div className="rank-current">
              <div className="rank-emblem large" style={{ borderColor: rank.current.color, color: rank.current.color }}>
                {rank.current.icon}
              </div>
              <strong style={{ color: rank.current.color }}>{rank.current.name}</strong>
            </div>
            <p>{rank.next ? `${xp}/${rank.next.xp} XP til ${rank.next.name}` : `${xp} XP · maks rank`}</p>
            <div className="bar-track">
              <div style={{ width: `${rankProgress}%` }} />
            </div>
            <div className="rank-ladder" aria-label="Rankstige">
              {RANKS.map((item) => (
                <div
                  className={xp >= item.xp ? "rank-emblem unlocked" : "rank-emblem"}
                  key={item.name}
                  style={{ borderColor: item.color, color: item.color }}
                  title={`${item.name} · ${item.xp} XP`}
                >
                  {item.icon}
                </div>
              ))}
            </div>
          </div>
          <div className="stat-card goal-card">
            <span>I dag</span>
            <strong>
              {todayMinutes}/{dailyGoal}
            </strong>
            <p>minutter mot dagsmål</p>
            <div className="bar-track">
              <div style={{ width: `${dailyGoalProgress}%` }} />
            </div>
          </div>
          <div className="stat-card streak-card">
            <span>Streak</span>
            <strong>{streak}</strong>
            <p>{goalReachedToday ? "dagsmål nådd i dag" : "nå dagsmålet for å øke"}</p>
          </div>
          <div className="stat-card">
            <span>Badges</span>
            <strong>
              {unlockedAchievements}/{achievements.length}
            </strong>
            <p>achievements låst opp</p>
          </div>
          <div className="stat-card">
            <span>Totalt</span>
            <strong>{minutes}</strong>
            <p>minutter siste {days} dager</p>
          </div>
          <div className="stat-card">
            <span>Økter</span>
            <strong>{completedSessions}</strong>
            <p>fullførte økter</p>
          </div>
          <div className="stat-card">
            <span>Aktiv</span>
            <strong>{active ? "Ja" : "Nei"}</strong>
            <p>{active ? TYPE_LABELS[active.type] : "klar for neste"}</p>
          </div>
        </section>
      </section>

      <section className="panel courses-panel">
        <div className="panel-heading">
          <p className="eyebrow">Fag</p>
          <h2>Kurs og emner</h2>
        </div>

        <form className="course-form" onSubmit={createCourse}>
          <input
            placeholder="F.eks. Databaser"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
          />
          <input
            placeholder="Kode"
            value={newCourseCode}
            onChange={(e) => setNewCourseCode(e.target.value)}
          />
          <button className="primary-action" disabled={working || !newCourseName.trim()} type="submit">
            Legg til fag
          </button>
        </form>

        <div className="course-list">
          {courses.length === 0 && <p className="empty-state">Ingen fag ennå. Legg til et fag og knytt økter til det.</p>}
          {courses.map((course) => (
            <div className="course-chip-wrap" key={course.id}>
              <button
                className={selectedCourseId === course.id ? "course-chip active" : "course-chip"}
                onClick={() => setSelectedCourseId((current) => (current === course.id ? "" : course.id))}
                type="button"
              >
                <span style={{ background: course.color ?? "var(--accent)" }} />
                <strong>{course.code ? `${course.code} - ${course.name}` : course.name}</strong>
              </button>
              <button
                aria-label={`Slett ${course.name}`}
                className="course-delete"
                onClick={() => void deleteCourse(course.id)}
                title="Slett fag"
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="game-grid">
        <article className="panel achievements-panel">
          <div className="panel-heading">
            <p className="eyebrow">Achievements</p>
            <h2>Badges</h2>
          </div>

          <div className="achievement-list">
            {achievements.map((achievement) => (
              <div
                className={achievement.unlocked ? "achievement-card unlocked" : "achievement-card"}
                key={achievement.title}
              >
                <span>{achievement.unlocked ? "✓" : "•"}</span>
                <div>
                  <strong>{achievement.title}</strong>
                  <p>{achievement.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel heatmap-panel">
          <div className="panel-heading">
            <p className="eyebrow">Heatmap</p>
            <h2>Studieaktivitet</h2>
          </div>

          <div className="heatmap-grid" aria-label="Studieaktivitet per dag">
            {daily.map((item) => (
              <div
                aria-label={`${item.date}: ${item.minutes} minutter`}
                className={`heat-cell level-${heatLevel(item.minutes, dailyGoal)}`}
                key={item.date}
                title={`${item.date}: ${item.minutes} minutter`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Lav</span>
            <div className="heat-cell level-1" />
            <div className="heat-cell level-2" />
            <div className="heat-cell level-3" />
            <div className="heat-cell level-4" />
            <span>Høy</span>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading row">
            <div>
              <p className="eyebrow">Progresjon</p>
              <h2>Daglige minutter</h2>
            </div>
          </div>

          <div className="bar-list">
            {daily.length === 0 && <p className="empty-state">Ingen daglige data ennå.</p>}
            {daily.map((item) => (
              <div className="bar-row" key={item.date}>
                <span>{shortDate(item.date)}</span>
                <div className="bar-track">
                  <div style={{ width: `${Math.max((item.minutes / maxDaily) * 100, 4)}%` }} />
                </div>
                <strong>{item.minutes}m</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Fordeling</p>
            <h2>Minutter etter type</h2>
          </div>

          <div className="type-summary">
            {byType.length === 0 && <p className="empty-state">Start en økt for å se fordeling.</p>}
            {byType.map((item) => (
              <div className="type-row" key={item.type}>
                <div>
                  <span>{TYPE_LABELS[item.type]}</span>
                  <strong>{item.minutes} min</strong>
                </div>
                <div className="bar-track">
                  <div style={{ width: `${Math.max((item.minutes / maxType) * 100, 5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <p className="eyebrow">Historikk</p>
          <h2>Siste økter</h2>
        </div>

        <div className="session-list">
          {loading && <p className="empty-state">Laster økter...</p>}
          {!loading && recent.length === 0 && <p className="empty-state">Ingen økter registrert ennå.</p>}
          {recent.map((session) => (
            <article className="session-row" key={session.id}>
              <div>
                <span className="session-type">{TYPE_LABELS[session.type]}</span>
                <strong>{formatDate(session.startTime)}</strong>
                <p>
                  {courseName(courses, session.courseId)}
                  {session.notes ? ` · ${session.notes}` : ""}
                </p>
              </div>
              <div className="session-meta">
                <span>{session.endTime ? formatDate(session.endTime) : "Pågår"}</span>
                <strong>{session.durationMinutes ?? "-"} min</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
