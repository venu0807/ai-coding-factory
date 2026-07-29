import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import ToastContainer from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Project from "./pages/Project";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ConfirmEmail from "./pages/ConfirmEmail";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer />
        <Navbar />
        <Routes>
          <Route path="/" element={<ErrorBoundary><Index /></ErrorBoundary>} />
          <Route path="/project/:id" element={<ErrorBoundary><Project /></ErrorBoundary>} />
          <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/signup" element={<ErrorBoundary><Signup /></ErrorBoundary>} />
          <Route path="/confirm-email" element={<ErrorBoundary><ConfirmEmail /></ErrorBoundary>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}