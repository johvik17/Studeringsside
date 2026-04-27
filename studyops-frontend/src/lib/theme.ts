export type ThemeName = "light-blue" | "black-green" | "black-red" | "green-blue";

export const THEME_KEY = "studyops_theme";

export const THEMES: Array<{
  name: ThemeName;
  label: string;
  colors: [string, string];
}> = [
  { name: "light-blue", label: "Hvit og blå", colors: ["#f8fbff", "#2563eb"] },
  { name: "black-green", label: "Svart og grønn", colors: ["#07110c", "#22c55e"] },
  { name: "black-red", label: "Svart og rød", colors: ["#120708", "#ef4444"] },
  { name: "green-blue", label: "Grønn og blå", colors: ["#06231c", "#38bdf8"] },
];

export function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_KEY);
  return THEMES.some((theme) => theme.name === stored) ? (stored as ThemeName) : "black-green";
}
