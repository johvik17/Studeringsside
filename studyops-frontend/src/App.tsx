import { useState } from "react";
import { getToken } from "./lib/auth";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());

  return authed ? (
    <DashboardPage onLogout={() => setAuthed(false)} />
  ) : (
    <LoginPage onLoggedIn={() => setAuthed(true)} />
  );
}