import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { loadOverrides } from "./i18n";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const paint = () =>
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

// Owner wording overrides are fetched BEFORE the first paint, so a rewritten
// label never renders in its old wording and then flips. It is one small
// same-origin file and loadOverrides() can only resolve — it swallows a 404,
// a parse error and an offline fetch alike — so this cannot delay or block
// the app on a bad response.
loadOverrides().then(paint, paint);
