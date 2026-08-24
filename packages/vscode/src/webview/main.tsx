import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./tailwind.css";
import "@amarantha/theme/index.css";
import "./vscode-theme-adapter.css";
import { WebviewApp } from "./WebviewApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WebviewApp />
  </React.StrictMode>
);
