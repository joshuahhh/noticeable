import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Cells } from "./Cells.js";
import { Files } from "./Files.js";
import { ParseAndTranspile } from "./ParseAndTranspile.js";
import { Root } from "./Root.js";
import "./index.css";
import "./of/client/stdlib/inputs.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/parse-and-transpile" element={<ParseAndTranspile />} />
        <Route path="/cells" element={<Cells />} />
        <Route path="/files" element={<Files />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
