import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isBeamerWindow } from "./beamerChannel";
import { installCloseGuard } from "./printGuard";
import { BeamerApp } from "./ui/BeamerApp";

const beamer = isBeamerWindow();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{beamer ? <BeamerApp /> : <App />}</React.StrictMode>,
);

if (!beamer) void installCloseGuard();
