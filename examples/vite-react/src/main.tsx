import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
// oxlint-disable-next-line import/no-unassigned-import -- Vite extracts this CSS entry.
import "./style.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Missing required element #root");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
