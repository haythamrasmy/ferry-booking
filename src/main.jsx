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

import OfflinePassengers from "./OfflinePassengers";


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

        <Route
    path="/offline"
    element={<OfflinePassengers />}
/>

       
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);