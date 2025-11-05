import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Popup 컨텍스트 표시
document.body.setAttribute("data-context", "popup");

ReactDOM.createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
