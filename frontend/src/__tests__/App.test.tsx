import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import App from "../App";
import "@testing-library/jest-dom";

vi.mock("../api/client", () => ({
  fetchEventCategories: vi.fn().mockResolvedValue([]),
  fetchEvents: vi.fn().mockResolvedValue([]),
  fetchXpSummary: vi.fn().mockResolvedValue({ total: 0, by_category: {} }),
  fetchFeedbackSummary: vi.fn().mockResolvedValue({ average_rating: 0, mood_counts: {}, total_feedback: 0 }),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  completeEvent: vi.fn(),
  submitFeedback: vi.fn()
}));

describe("App", () => {
  it("renders top bar", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/XP Progress/i)).toBeInTheDocument());
  });
});
