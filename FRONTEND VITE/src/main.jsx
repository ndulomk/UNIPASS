import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css"
import { Provider } from 'react-redux'
import App from "./App";
import store from "./store/index" 
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
      <Toaster position="top-right"/>
        <App />   
      </BrowserRouter>
    </Provider>
  </StrictMode>
);