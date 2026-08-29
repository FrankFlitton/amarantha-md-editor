import React from "react";
import ReactDOM from "react-dom/client";
import "./tailwind.css";
import "@amarantha/theme/index.css";
import "./options.css";
import { OptionsApp } from "./OptionsApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
