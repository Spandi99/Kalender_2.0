import { render, screen } from "@testing-library/react";

import App from "../../App";

jest.mock("../../api/client", () => {
  const mockClient = {
    get: jest.fn((url: string) => {
      if (url.includes("xp/progress")) {
        return Promise.resolve({
          data: {
            current_xp: 620,
            current_level: 2,
            milestones: [
              { level: 1, required_xp: 0, reward: "Welcome" },
              { level: 2, required_xp: 500, reward: "Theme" }
            ],
          },
        });
      }
      if (url.includes("calendar/events")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    }),
    post: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
  };
  return { __esModule: true, default: mockClient };
});

describe("App", () => {
  it("renders the dashboard headers", () => {
    render(<App />);
    expect(screen.getByText(/AI Calendar XP/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/XP Dashboard/i)).toBeInTheDocument();
  });
});
