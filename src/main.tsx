import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./output.css";
import { FileProvider } from "./context/FileContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <FileProvider>
          <App />
        </FileProvider>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
