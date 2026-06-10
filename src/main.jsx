import React from "react";
import ReactDOM from "react-dom/client";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import "./index.css";

import App from "./App";
import Admin from "./Admin";
import CargoScanner from "./CargoScanner";
ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"
         element={<App />} />

        <Route
          path="/admin"
          element={<Admin />}
        />
        <Route
          path="/scanner"
          element={<CargoScanner />}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);