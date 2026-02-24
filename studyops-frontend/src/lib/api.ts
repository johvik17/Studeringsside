export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export type SessionType = "POMODORO" | "DEEP_WORK" | "READING" | "CODING";

export type Session = {
  id: number;
  type: SessionType;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
};

export type DailySummary = { date: string; minutes: number };
export type TypeSummary = { type: SessionType; minutes: number };

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = opts;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      ...authHeaders(token ?? null),
    } as Record<string, string>,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<{ sub: string; uid: number; email: string }>("/api/me", { token }),

  startSession: (token: string, type: SessionType, notes?: string) =>
    request<Session>("/api/sessions/start", {
      method: "POST",
      token,
      body: JSON.stringify({ type, notes }),
    }),

  stopSession: (token: string, id: number) =>
    request<Session>(`/api/sessions/${id}/stop`, {
      method: "POST",
      token,
    }),

  activeSession: (token: string) =>
    request<Session>("/api/sessions/active", { token }),

  listSessions: (token: string, days = 30, limit = 200) =>
    request<Session>(`/api/sessions?days=${days}&limit=${limit}`, { token }) as unknown as Promise<Session[]>,

  dailySummary: (token: string, days = 30) =>
    request<DailySummary[]>(`/api/sessions/summary/daily?days=${days}`, { token }),

  byTypeSummary: (token: string, days = 30) =>
    request<TypeSummary[]>(`/api/sessions/summary/by-type?days=${days}`, { token }),
};