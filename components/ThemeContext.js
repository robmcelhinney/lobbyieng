import { createContext, useContext, useEffect, useState } from "react";

// Colorblind-safe palettes for light and dark
const colorblindPalette = {
  light: {
    background: "#f7f7f7",
    text: "#222",
    primary: "#0072B2",
    secondary: "#009E73",
    accent: "#D55E00",
    // Add more as needed
  },
  dark: {
    background: "#222426",
    text: "#f7f7f7",
    primary: "#56B4E9",
    secondary: "#F0E442",
    accent: "#E69F00",
    // Add more as needed
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // On mount, check localStorage
    const stored =
      typeof window !== "undefined" && localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, palette: colorblindPalette[theme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
