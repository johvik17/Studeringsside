import { useEffect, useState } from "react";
import { getToken } from "./lib/auth";
import { getStoredTheme, THEME_KEY } from "./lib/theme";
import type { ThemeName } from "./lib/theme";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return authed ? (
    <DashboardPage onLogout={() => setAuthed(false)} onThemeChange={setTheme} theme={theme} />
  ) : (
    <LoginPage onLoggedIn={() => setAuthed(true)} onThemeChange={setTheme} theme={theme} />
  );
}
