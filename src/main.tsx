import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { FromCLI } from "./FromCLI";
import { FromFilePicker } from "./FromFilePicker";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<FromFilePicker />} />
        <Route path="/cli" element={<FromCLI />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
