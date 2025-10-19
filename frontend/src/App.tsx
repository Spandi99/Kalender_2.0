import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";

import Dashboard from "./components/dashboard/Dashboard";
import CalendarView from "./components/dashboard/CalendarView";
import XPView from "./components/dashboard/XPView";
import AIView from "./components/dashboard/AIView";
import TemplatesView from "./components/dashboard/TemplatesView";
import FeedbackView from "./components/dashboard/FeedbackView";
import ICalView from "./components/dashboard/ICalView";
import LegacyApp from "./LegacyApp";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<CalendarView />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="xp" element={<XPView />} />
        <Route path="ical" element={<ICalView />} />
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

export default function App() {
  const isInRouter = useInRouterContext();

  if (isInRouter) {
    return <AppRoutes />;
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
