import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error CSS is handled by the bundler and 'has no TypeScript declarations.
import "./index.css";
import App from "./App";
import  './amplify'
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
