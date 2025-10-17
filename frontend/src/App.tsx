import { Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./components/dashboard/Dashboard";
import CalendarView from "./components/dashboard/CalendarView";
import XPView from "./components/dashboard/XPView";
import AIView from "./components/dashboard/AIView";
import TemplatesView from "./components/dashboard/TemplatesView";
import FeedbackView from "./components/dashboard/FeedbackView";
import LegacyApp from "./LegacyApp";

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<CalendarView />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="xp" element={<XPView />} />
        <Route path="ai" element={<AIView />} />
        <Route path="templates" element={<TemplatesView />} />
        <Route path="feedback" element={<FeedbackView />} />
      </Route>
      <Route path="/legacy/*" element={<LegacyApp />} />
      <Route path="/" element={<Navigate to="/dashboard/calendar" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/calendar" replace />} />
    </Routes>
  );
}
