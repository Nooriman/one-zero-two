import React from "react";
import ReactDOM from "react-dom/client";
import AccessGate from "./AccessGate";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AccessGate>
      <App />
    </AccessGate>
  </React.StrictMode>,
);
