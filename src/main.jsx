import React from "react";
import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import SkyCastApp from "./menu.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <SkyCastApp />
    <SpeedInsights />
  </React.StrictMode>
);
