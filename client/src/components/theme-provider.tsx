import { createContext, useContext, useEffect } from "react";

type ThemeProviderContextType = {
  theme: "dark";
  setTheme: (theme: "dark") => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType>({
  theme: "dark",
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);

  return (
    <ThemeProviderContext.Provider value={{ theme: "dark", setTheme: () => null }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
