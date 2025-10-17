import { Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./components/dashboard/Dashboard";
import LegacyApp from "./LegacyApp";

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/legacy/*" element={<LegacyApp />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
