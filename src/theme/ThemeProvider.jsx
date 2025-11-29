import React, { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

const ThemeContext = createContext();

export const useThemeMode = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }) => {
  const storedMode = localStorage.getItem("themeMode") || "light";
  const [mode, setMode] = useState(storedMode);

  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    localStorage.setItem("themeMode", newMode);
  };

  // THEME DEFINITIONS
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "light"
            ? {
                background: {
                  default: "#f6f9fc",
                  paper: "rgba(255,255,255,0.65)",
                },
                text: {
                  primary: "#1a1a1a",
                },
              }
            : {
                background: {
                  default: "#0d1117",
                  paper: "rgba(255,255,255,0.08)",
                },
                text: {
                  primary: "#f6f6f6",
                },
              }),
        },

        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backdropFilter: "blur(15px)",
                borderRadius: "20px",
                transition: "0.3s ease",
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
