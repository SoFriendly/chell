import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Show window after content is ready
const showWindow = async () => {
  try {
    const window = getCurrentWindow();
    await window.show();
    await window.setFocus();
  } catch (e) {
    console.error("Failed to show window:", e);
  }
};

// Small delay to ensure content is painted
setTimeout(showWindow, 100);
